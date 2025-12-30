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
 * In a production app, this would be Redis.
 */

// Maps Room Code -> Host Socket ID
const rooms: Map<string, string> = new Map();

// Maps Socket ID -> Room Code (For O(1) disconnect handling)
const socketToRoom: Map<string, string> = new Map();

io.on('connection', (socket: Socket) => {
    console.log(`[Connect] Socket ID: ${ socket.id }`);

    /**
     * HOST: Registers a new game lobby.
     * @param roomCode - Unique identifier for the room (Client generates this).
     * @param callback - Acknowledgment callback to client.
     */
    socket.on('host:create', (roomCode: string, callback: (response: { success: boolean }) => void) => {
        // Normalize input
        const code = roomCode.toUpperCase();

        if (rooms.has(code)) {
            console.warn(`[Host] Failed to create room ${ code }: Already exists.`);
            callback({ success: false });
            return;
        }

        // 1. Register Room
        rooms.set(code, socket.id);
        socketToRoom.set(socket.id, code);

        // 2. Join Socket Channel (For broadcast events)
        socket.join(code);

        console.log(`[Host] Room created: ${ code } by ${ socket.id }`);
        callback({ success: true });
    });

    /**
     * CLIENT: Attempts to join an existing lobby.
     * @param roomCode - The code of the room to join.
     */
    socket.on('client:join', (roomCode: string) => {
        const code = roomCode.toUpperCase();
        const hostId = rooms.get(code);

        // 1. Validation
        if (!hostId) {
            socket.emit('error', { message: 'Room not found.' });
            return;
        }

        // 2. Subscribe to Lobby Events (Crucial for receiving 'room:closed')
        socket.join(code);

        // 3. Notify Host
        // The Host will receive this event and initiate the WebRTC handshake (Offer).
        io.to(hostId).emit('host:peer-joining', {
            peerId: socket.id
        });

        console.log(`[Client] ${ socket.id } joined lobby ${ code }`);
    });

    /**
     * SIGNALING: Relays WebRTC handshake data (SDP/ICE).
     * This acts as the "Switchboard" for P2P connections.
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
        const roomCode = socketToRoom.get(socket.id);

        if (roomCode) {
            // Check if the disconnecting user was the Host
            const hostId = rooms.get(roomCode);

            if (hostId === socket.id) {
                // HOST LEFT: Kill the room
                console.log(`[Disconnect] Host left. Closing room ${ roomCode }`);

                // Notify all clients in the room to reset their state
                io.to(roomCode).emit('room:closed');

                // Cleanup maps
                rooms.delete(roomCode);
            } else {
                // CLIENT LEFT: (Optional) Notify host if needed
                console.log(`[Disconnect] Client left room ${ roomCode }`);
            }

            // Cleanup reverse lookup
            socketToRoom.delete(socket.id);
        }

        console.log(`[Disconnect] Socket ID: ${ socket.id }`);
    });
});

server.listen(PORT, () => {
    console.log(`----------------------------------------`);
    console.log(`Signal Server running on port ${ PORT }`);
    console.log(`CORS Policy: ${ CORS_ORIGIN }`);
    console.log(`----------------------------------------`);
});
