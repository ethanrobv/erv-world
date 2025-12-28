import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Config
 */
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));

const server = http.createServer(app);

/**
 * Socket.IO Instance.
 * Configured to respect the environment's CORS policy.
 */
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST']
    }
});

/**
 * Room Registry.
 * Maps a Room Code (string) to the Host's Socket ID.
 */
const rooms: Map<string, string> = new Map();

io.on('connection', (socket: Socket) => {
    console.log(`[Connect] Socket ID: ${ socket.id }`);

    /**
     * HOST: Registers a new game lobby.
     * @param roomCode - Unique identifier for the room.
     * @param callback - Acknowledgment callback.
     */
    socket.on('host:create', (roomCode: string, callback: (response: { success: boolean }) => void) => {
        if (rooms.has(roomCode)) {
            console.warn(`[Host] Failed to create room ${ roomCode }: Already exists.`);
            callback({ success: false });
            return;
        }

        rooms.set(roomCode, socket.id);
        socket.join(roomCode);
        console.log(`[Host] Room created: ${ roomCode } by ${ socket.id }`);
        callback({ success: true });
    });

    /**
     * CLIENT: Attempts to join an existing lobby.
     * @param roomCode - The code of the room to join.
     */
    socket.on('client:join', (roomCode: string) => {
        const hostId = rooms.get(roomCode);

        if (!hostId) {
            socket.emit('error', { message: 'Room not found.' });
            return;
        }

        io.to(hostId).emit('host:peer-joining', {
            peerId: socket.id
        });

        console.log(`[Client] ${ socket.id } attempting to join room ${ roomCode }`);
    });

    /**
     * SIGNALING: Relays WebRTC handshake data (SDP/ICE).
     * @param data - The payload containing the signal and target.
     */
    socket.on('signal', (data: { target: string; signal: unknown }) => {
        io.to(data.target).emit('signal', {
            sender: socket.id,
            signal: data.signal
        });
    });

    /**
     * DISCONNECT: Cleanup routine.
     */
    socket.on('disconnect', () => {
        for (const [code, hostId] of rooms.entries()) {
            if (hostId === socket.id) {
                console.log(`[Disconnect] Host left. Closing room ${ code }`);
                rooms.delete(code);
                io.to(code).emit('room:closed');
                break;
            }
        }
        console.log(`[Disconnect] Socket ID: ${ socket.id }`);
    });
});

server.listen(PORT, () => {
    console.log(`Signal Server running on port ${ PORT }`);
    console.log(`CORS Policy: ${ CORS_ORIGIN }`);
});
