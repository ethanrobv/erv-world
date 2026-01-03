import express, { Request, Response } from 'express';
import cors from 'cors';
import { ExpressPeerServer } from 'peer';
import http from 'http';
import db from './db';
import { Registry } from './registry';
import { SaveRequest } from './types';

const PORT = parseInt(process.env.PORT || '8081', 10);

const app = express();
const httpServer = http.createServer(app);

// Enable CORS for client-server communication
app.use(cors({ origin: '*' }));
app.use(express.json());

// -----------------------------------------------------------------------------
// PeerJS Signaling
// -----------------------------------------------------------------------------

/**
 * Attach PeerJS to the existing HTTP server instance.
 * This prevents port collision by sharing the listener.
 */
const peerServer = ExpressPeerServer(httpServer, {
    path: '/',
    allow_discovery: true,
});

app.use('/peerjs', peerServer);

/**
 * Event listener for PeerJS client disconnections.
 * Automatically removes the room from the registry if the host disconnects.
 */
peerServer.on('disconnect', (client) => {
    const roomId = Registry.findRoomByHostId(client.getId());
    if (roomId) {
        Registry.removeRoom(roomId);
    }
});

// -----------------------------------------------------------------------------
// API: Rooms
// -----------------------------------------------------------------------------

/**
 * GET /api/rooms
 * Retrieves a list of all currently active rooms.
 */
app.get('/api/rooms', (_req: Request, res: Response) => {
    res.json(Registry.listRooms());
});

/**
 * POST /api/rooms
 * Registers a new room. Called by a client when they become a Host.
 * * @param req.body.id - The unique Room Code (usually the Host's Peer ID).
 * @param req.body.name - The display name for the room.
 * @param req.body.hostPeerId - The Peer ID of the host.
 * @param req.body.maxPlayers - Optional max player limit (default: 10).
 */
app.post('/api/rooms', (req: Request, res: Response) => {
    const { id, name, hostPeerId, maxPlayers } = req.body;

    if (!id || !hostPeerId) {
        res.status(400).json({ error: 'Missing room ID or Host Peer ID' });
        return;
    }

    Registry.addRoom({
        id,
        name: name || 'Unknown Waters',
        hostPeerId,
        currentPlayers: 1,
        maxPlayers: maxPlayers || 10,
        createdAt: Date.now(),
    });

    res.json({ success: true });
});

// -----------------------------------------------------------------------------
// API: Persistence
// -----------------------------------------------------------------------------

/**
 * POST /api/save
 * Persists player XP and fishing logs to the SQLite database.
 * * @param req.body.playerId - The UUID of the player.
 * @param req.body.username - The current username of the player.
 * @param req.body.xpGained - The amount of XP gained since last save.
 * @param req.body.newCatchLog - A dictionary of new fish caught { fishId: count }.
 */
app.post('/api/save', (req: Request, res: Response) => {
    const { playerId, username, xpGained, newCatchLog } = req.body as SaveRequest;

    if (!playerId) {
        res.status(400).json({ error: 'Missing Player ID' });
        return;
    }

    try {
        const existing = db.prepare('SELECT * FROM players WHERE id = ?').get(playerId) as any;
        const currentLog = existing ? JSON.parse(existing.fishing_log) : {};

        // Merge new catches into the existing log
        for (const [fish, count] of Object.entries(newCatchLog || {})) {
            currentLog[fish] = (currentLog[fish] || 0) + (count as number);
        }

        // Upsert operation: Insert if new, update XP and Log if exists
        const stmt = db.prepare(`
            INSERT INTO players (id, username, xp, fishing_log, last_seen)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                xp = xp + ?,
                                       fishing_log = ?,
                                       last_seen = CURRENT_TIMESTAMP
                                       ${username ? ', username = ?' : ''}
        `);

        const params = [
            playerId,
            username || 'Angler',
            existing ? xpGained : 0,
            JSON.stringify(currentLog),
            xpGained,
            JSON.stringify(currentLog)
        ];

        if (username) params.push(username);

        stmt.run(...params);

        res.json({ success: true, newTotalXp: (existing?.xp || 0) + xpGained });
    } catch (err) {
        console.error('[API] Save error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// -----------------------------------------------------------------------------
// Start Server
// -----------------------------------------------------------------------------

httpServer.listen(PORT, () => {
    console.log(`> Server ready on http://localhost:${PORT}`);
    console.log(`> PeerJS ready on http://localhost:${PORT}/peerjs`);
});
