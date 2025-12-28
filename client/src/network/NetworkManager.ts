import { io, Socket } from 'socket.io-client';
import SimplePeer, { type Instance as PeerInstance, type SignalData } from 'simple-peer';
import { decode, encode } from '@msgpack/msgpack';
import { useNetworkStore } from '../store/networkStore';
import { type GamePacket } from './Protocol';

/**
 * Configuration for the signaling server connection.
 */
const SIGNAL_SERVER_URL = import.meta.env.VITE_SIGNAL_SERVER_URL || 'http://localhost:3001';

/**
 * NetworkManager Singleton.
 * * Manages the lifecycle of the P2P network, including signaling via Socket.io
 * and data transmission via WebRTC.
 * * DESIGN DECISIONS:
 * 1. Singleton Pattern: Ensures a single point of truth for network connections
 * independent of the React lifecycle.
 * 2. Star Topology: In a multiplayer session, one peer is the 'HOST' and
 * others are 'CLIENTS'. This centralizes game logic authority.
 * 3. Binary Protocol: Uses MessagePack (msgpack) instead of JSON for high-performance,
 * low-bandwidth serialization suitable for 60Hz game loops.
 */
class NetworkManager {
    private socket: Socket | null = null;

    /**
     * Internal registry of peer connections.
     * Key: Socket ID of the remote peer.
     * Value: SimplePeer instance.
     */
    private peers: Map<string, PeerInstance> = new Map();

    constructor() {
        this.initializeSignalConnection();
    }

    /**
     * Initializes the connection to the Signal Server.
     * Sets up listeners for room management and WebRTC signaling.
     */
    private initializeSignalConnection(): void {
        this.socket = io(SIGNAL_SERVER_URL);

        this.socket.on('connect', () => {
            useNetworkStore.getState().setSignalStatus(true);
        });

        this.socket.on('disconnect', () => {
            useNetworkStore.getState().setSignalStatus(false);
            this.cleanupAllPeers();
        });

        /**
         * Listener for incoming WebRTC signals.
         * Logic: If a peer instance exists, provide the signal.
         * If not, and we are not the initiator, create a new peer instance.
         */
        this.socket.on('signal', ({ sender, signal }: { sender: string; signal: SignalData }) => {
            const peer = this.peers.get(sender);

            if (peer) {
                peer.signal(signal);
            } else {
                // We are the receiver of a join request. Initialize a non-initiating peer.
                this.createPeer(sender, false, signal);
            }
        });

        /**
         * Host-specific: Triggered when a client attempts to join the room.
         */
        this.socket.on('host:peer-joining', ({ peerId }: { peerId: string }) => {
            this.createPeer(peerId, true);
        });
    }

    /**
     * Creates and configures a WebRTC Peer connection.
     * @param targetId - The socket ID of the remote peer.
     * @param initiator - Whether this instance is initiating the handshake.
     * @param initialSignal - Optional signal data to process on creation.
     */
    private createPeer(targetId: string, initiator: boolean, initialSignal?: SignalData): void {
        const peer = new SimplePeer({
            initiator,
            trickle: false, // Wait for all ICE candidates to simplify signaling flow.
        });

        /**
         * Relays local signaling data to the remote peer via the Signal Server.
         */
        peer.on('signal', (signal: SignalData) => {
            this.socket?.emit('signal', { target: targetId, signal });
        });

        /**
         * Handshake successful. Peer is ready for data transfer.
         */
        peer.on('connect', () => {
            useNetworkStore.getState().addPeer(targetId);
            // NOTE: The initial World Snapshot is triggered by the Game Engine,
            // not here, to keep this class pure logic.
        });

        /**
         * Handles incoming data from the peer.
         */
        peer.on('data', (data: Uint8Array) => {
            this.processIncomingData(targetId, data);
        });

        /**
         * Error and Close handling.
         */
        peer.on('close', () => this.removePeer(targetId));
        peer.on('error', (err: Error) => {
            console.error(`[Network] Peer Error (${ targetId }):`, err);
            this.removePeer(targetId);
        });

        if (initialSignal) {
            peer.signal(initialSignal);
        }

        this.peers.set(targetId, peer);
    }

    /**
     * Registers a new room with the Signal Server.
     * * @param roomCode - The desired room identifier.
     * @returns Promise resolving to the success state of the creation.
     */
    public async createRoom(roomCode: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.socket?.emit('host:create', roomCode, (response: { success: boolean }) => {
                if (response.success) {
                    useNetworkStore.getState().setRoomInfo(roomCode, 'HOST');
                }
                resolve(response.success);
            });
        });
    }

    /**
     * Joins an existing room via the Signal Server.
     * * @param roomCode - The target room identifier.
     */
    public joinRoom(roomCode: string): void {
        this.socket?.emit('client:join', roomCode);
        useNetworkStore.getState().setRoomInfo(roomCode, 'CLIENT');
    }

    /**
     * Sends a strictly typed message to a specific peer.
     * Uses MessagePack for binary serialization.
     * @param targetId - Socket ID of the recipient.
     * @param packet - The typed GamePacket to serialize.
     */
    public send(targetId: string, packet: GamePacket): void {
        const peer = this.peers.get(targetId);
        if (peer?.connected) {
            const encoded = encode(packet);
            peer.send(encoded);
        }
    }

    /**
     * Broadcasts a strictly typed message to all connected peers.
     * Uses MessagePack for binary serialization.
     * * @param packet - The typed GamePacket to serialize.
     */
    public broadcast(packet: GamePacket): void {
        const encoded = encode(packet);
        this.peers.forEach((peer) => {
            if (peer.connected) {
                peer.send(encoded);
            }
        });
    }

    /**
     * Decodes and routes incoming P2P data.
     * @param senderId - Socket ID of the sender.
     * @param data - The raw binary data (Uint8Array).
     */
    private processIncomingData(senderId: string, data: Uint8Array): void {
        try {
            // Binary Decode (MessagePack)
            // We cast to GamePacket because we trust our Protocol definition.
            const packet = decode(data) as GamePacket;

            // TODO: Route this packet to the Game Engine / Event Bus.
            // For now, we log it to verify the binary stream is working.
            // console.log(`[Packet] From ${ senderId }:`, packet);

        } catch (err) {
            console.error('[Network] Packet Decode Error:', err);
        }
    }

    /**
     * Cleans up a specific peer connection.
     */
    private removePeer(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.destroy();
            this.peers.delete(peerId);
        }
        useNetworkStore.getState().removePeer(peerId);
    }

    /**
     * Cleans up all active peer connections.
     */
    private cleanupAllPeers(): void {
        this.peers.forEach((peer) => peer.destroy());
        this.peers.clear();
        useNetworkStore.getState().reset();
    }
}

/**
 * Singleton instance of the NetworkManager.
 */
export const networkManager = new NetworkManager();
