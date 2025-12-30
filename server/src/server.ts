import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

/**
 * CONFIGURATION
 */
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));

const server = http.createServer(app);

/**
 * SOCKET.IO INSTANCE
 */
const io = new Server(server, {
    cors: {
        origin: CORS_ORIGIN,
        methods: ['GET', 'POST']
    }
});

/**
 * STATE MANAGEMENT
 * In a production app, this would be backed by Redis.
 */

/** Maps Room Code (e.g. "ABCD") -> Host Socket ID */
const rooms: Map<string, string> = new Map();

/** Maps Socket ID -> Room Code (For O(1) disconnect lookups) */
const socketToRoom: Map<string, string> = new Map();

/**
 * Generates a unique 4-character room code.
 * @returns A unique uppercase alphanumeric string.
 */
const generateRoomCode = (): string => {
    let code = '';
    do {
        code = Math.random().toString(36).substring(2, 6).toUpperCase();
    } while (rooms.has(code));
    return code;
};

io.on('connection', (socket: Socket) => {
    console.log(`[Connect] Socket ID: ${ socket.id }`);

    /**
     * HOST: Request a new room. The server generates the code to ensure uniqueness.
     * @param callback - Returns success status and the generated room code.
     */
    socket.on('host:create', (callback: (response: { success: boolean; code?: string }) => void) => {
        const code = generateRoomCode();

        rooms.set(code, socket.id);
        socketToRoom.set(socket.id, code);
        socket.join(code);

        console.log(`[Host] Room created: ${ code } by ${ socket.id }`);
        callback({ success: true, code });
    });

    /**
     * MIGRATION: A Backup Host (Heir) attempts to claim a room after the original Host disconnects.
     * @param roomCode - The code of the room to claim.
     * @param callback - Returns success if the room is available (or recently abandoned).
     */
    socket.on('host:claim', (roomCode: string, callback: (response: { success: boolean }) => void) => {
        const code = roomCode.toUpperCase();

        if (rooms.has(code)) {
            console.warn(`[Host] Claim failed for ${ code }: Room still occupied.`);
            callback({ success: false });
            return;
        }

        rooms.set(code, socket.id);
        socketToRoom.set(socket.id, code);
        socket.join(code);

        console.log(`[Migration] Room ${ code } claimed by new Host ${ socket.id }`);
        callback({ success: true });
    });

    /**
     * CLIENT: Attempts to join an existing lobby.
     * @param roomCode - The 4-character code of the room to join.
     */
    socket.on('client:join', (roomCode: string) => {
        const code = roomCode.toUpperCase();
        const hostId = rooms.get(code);

        if (!hostId) {
            socket.emit('error', { message: 'Room not found.' });
            return;
        }

        socket.join(code);

        // Notify Host to initiate WebRTC Offer
        io.to(hostId).emit('host:peer-joining', {
            peerId: socket.id
        });

        console.log(`[Client] ${ socket.id } joined lobby ${ code }`);
    });

    /**
     * SIGNALING: Relays WebRTC handshake data (SDP/ICE) between peers.
     */
    socket.on('signal', (data: { target: string; signal: unknown }) => {
        io.to(data.target).emit('signal', {
            sender: socket.id,
            signal: data.signal
        });
    });

    /**
     * DISCONNECT: Handles cleanup and triggers Host Migration if necessary.
     */
    socket.on('disconnect', () => {
        const roomCode = socketToRoom.get(socket.id);

        if (roomCode) {
            const hostId = rooms.get(roomCode);

            if (hostId === socket.id) {
                console.log(`[Disconnect] Host left room ${ roomCode }. Triggering migration.`);

                // Clear the room mapping so the Heir can claim it via 'host:claim'
                rooms.delete(roomCode);

                // Notify all clients in the room that the Host is gone.
                // Clients will check their local state to see if they are the designated Heir.
                io.to(roomCode).emit('room:host_left');
            } else {
                console.log(`[Disconnect] Client left room ${ roomCode }`);
            }

            socketToRoom.delete(socket.id);
        }
    });
});

server.listen(PORT, () => {
    console.log(`----------------------------------------`);
    console.log(`Signal Server running on port ${ PORT }`);
    console.log(`----------------------------------------`);
});
