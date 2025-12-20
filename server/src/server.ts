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
  lastHeartbeat: number;
  createdAt: number;
}

const roomRegistry = new Map<string, RoomData>();

// --- GARBAGE COLLECTION ---
// We expect a heartbeat every 15s. We allow 60s of silence before deleting.
// This handles background tabs and minor network issues, but cleans up empty rooms quickly.

const CLEANUP_INTERVAL = 10000; // Check every 10s
const ROOM_TTL = 60000;         // Delete if silent for 60s

setInterval(() => {
  const now = Date.now();
  let deletedCount = 0;

  roomRegistry.forEach((data, code) => {
    if (now - data.lastHeartbeat > ROOM_TTL) {
      roomRegistry.delete(code);
      deletedCount++;
    }
  });

  if (deletedCount > 0) {
    console.log(`[GARBAGE COLLECTION] Removed ${ deletedCount } inactive rooms.`);
  }
}, CLEANUP_INTERVAL);

// --- API ROUTES ---

app.post('/api/game/host', (req: Request, res: Response) => {
  // safely cast/access body
  const { peerId } = req.body || {};

  if (!peerId || typeof peerId !== 'string') {
    res.status(400).json({ error: 'Missing or invalid peerId' });
    return;
  }

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
    res.status(404).json({ error: 'Room lost or Host mismatch' });
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

app.put('/api/game/room/:code', (req: Request, res: Response) => {
  const { peerId } = req.body;
  const code = req.params.code?.toUpperCase();
  const room = roomRegistry.get(code || '');

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const oldHost = room.hostId;
  room.hostId = peerId;
  room.lastHeartbeat = Date.now(); // Reset TTL on migration

  console.log(`[MIGRATION] Room ${ code } passed from ${ oldHost } to ${ peerId }`);
  res.json({ success: true });
});

// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, '../public')));

app.get(/.*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${ PORT }`);
});
