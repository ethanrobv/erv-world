import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

interface RoomData {
    hostId: string;
    lastHeartbeat: number;
    createdAt: number;
}

const roomRegistry = new Map<string, RoomData>();

// --- GARBAGE COLLECTION ---
// Check for dead rooms every 10 seconds
setInterval(() => {
    const now = Date.now();
    const TIMEOUT_DEAD = 30000; // 30 seconds of silence = delete room

    roomRegistry.forEach((data, code) => {
        if (now - data.lastHeartbeat > TIMEOUT_DEAD) {
            roomRegistry.delete(code);
            console.log(`[ROOM DELETED] Room ${ code } removed due to inactivity.`);
        }
    });
}, 10000);

// --- API ROUTES ---

app.post('/api/game/host', (req: Request, res: Response) => {
    const { peerId } = req.body;
    // Generate code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    roomRegistry.set(roomCode, {
        hostId: peerId,
        lastHeartbeat: Date.now(),
        createdAt: Date.now()
    });

    console.log(`[ROOM CREATED] Code: ${ roomCode } | Host: ${ peerId }`);
    res.json({ roomCode });
});

app.post('/api/game/heartbeat', (req: Request, res: Response) => {
    const { roomCode, peerId } = req.body;
    const code = roomCode?.toUpperCase();
    const room = roomRegistry.get(code);

    if (room && room.hostId === peerId) {
        room.lastHeartbeat = Date.now();
        res.sendStatus(200);
    } else {
        res.status(403).json({ error: 'Invalid heartbeat' });
    }
});

app.get('/api/game/room/:code', (req: Request, res: Response) => {
    const code = req.params.code?.toUpperCase();
    const room = roomRegistry.get(code || '');

    if (room) {
        res.json({ hostId: room.hostId });
    } else {
        res.status(404).json({ error: 'Room not found' });
    }
});

// CLAIM / MIGRATE ENDPOINT
app.put('/api/game/room/:code', (req: Request, res: Response) => {
    const { peerId } = req.body; // The Heir requesting control
    const code = req.params.code?.toUpperCase();
    const room = roomRegistry.get(code || '');

    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    const TIMEOUT_STALE = 3000; // 3 seconds grace period
    const timeSinceLastHeartbeat = Date.now() - room.lastHeartbeat;

    // Logic:
    // 1. If room is "stale" (Host gone > 3s), allow ANYONE to claim (Recovering Host).
    // 2. If room is active, this is a Migration logic (Heir Apparent), which we assume is valid if they call this.
    // (In a production app, you'd validate the Heir was in the player list, but simpler is better here).

    if (timeSinceLastHeartbeat > TIMEOUT_STALE) {
        const oldHost = room.hostId;
        room.hostId = peerId;
        room.lastHeartbeat = Date.now();

        console.log(`[MIGRATION] Room ${ code } passed from ${ oldHost } to ${ peerId } (Stale/Recovery)`);
        res.json({ success: true });
    } else {
        // If the host is technically active but we want to force migration (rare), logs warning
        console.warn(`[MIGRATION BLOCKED] Room ${ code } host active. Request from ${ peerId }`);
        res.status(409).json({ error: 'Host is still active' });
    }
});

// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, '../public')));

app.get(/.*/, (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${ PORT }`);
});
