import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

interface RoomData {
    hostId: string;
    lastUpdate: number;
    createdAt: number;
}

const roomRegistry = new Map<string, RoomData>();

const CLEANUP_INTERVAL = 300000; // Check every 300s

setInterval(() => {
    roomRegistry.forEach((data, code) => {
        if (!data.hostId) {
            roomRegistry.delete(code);
            console.log(`[GARBAGE COLLECTION] Deleted room ${ code }`);
        }
    });
}, CLEANUP_INTERVAL);

// API ROUTES

app.get('/api/game/rooms', (_req: Request, res: Response) => {
    const rooms = Array.from(roomRegistry.entries()).map(([code, data]) => ({
        code,
        age: Date.now() - data.createdAt
    }));
    res.json({ rooms });
});

/**
 * HOST ROOM (Initial Push)
 */
app.post('/api/game/host', (req: Request, res: Response) => {
    const { peerId } = req.body || {};

    if (!peerId || typeof peerId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid peerId' });
        return;
    }

    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    roomRegistry.set(roomCode, {
        hostId: peerId,
        lastUpdate: Date.now(),
        createdAt: Date.now()
    });

    console.log(`[ROOM CREATED] Code: ${ roomCode } | Host: ${ peerId }`);
    res.json({ roomCode });
});

app.put('/api/game/room/:code', (req: Request, res: Response) => {
    const { peerId } = req.body;
    const code = req.params.code?.toUpperCase();
    const room = roomRegistry.get(code || '');

    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }

    room.hostId = peerId;
    room.lastUpdate = Date.now();

    console.log(`[MIGRATION] Room ${ code } claimed by ${ peerId }`);
    res.json({ success: true });
});

app.get('/api/game/room/:code', (req: Request, res: Response) => {
    const code = req.params.code?.toUpperCase();
    const room = roomRegistry.get(code || '');

    if (room) {
        room.lastUpdate = Date.now();
        res.json({ hostId: room.hostId });
    } else {
        res.status(404).json({ error: 'Room not found' });
    }
});

app.delete('/api/game/room/:code', (req: Request, res: Response) => {
    const code = req.params.code?.toUpperCase();
    const { peerId } = req.body;

    if (!code || !peerId) {
        return res.status(400).json({ error: 'Missing code or peerId' });
    }

    const room = roomRegistry.get(code);

    if (!room) {
        return res.json({ success: true });
    }

    // Sanity check: the registered host should be sending the request
    if (room.hostId !== peerId) {
        console.warn(`[SECURITY] Failed delete attempt for ${ code }. Requestor: ${ peerId }, Host: ${ room.hostId }`);
        return res.status(403).json({ error: 'Unauthorized' });
    }

    roomRegistry.delete(code);
    console.log(`[ROOM] ${ code } deleted by host ${ peerId } (Clean Exit)`);
    res.json({ success: true });
});

// STATIC FILES

app.use(express.static(path.join(__dirname, '../public')));

app.get(/.*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${ PORT }`);
});
