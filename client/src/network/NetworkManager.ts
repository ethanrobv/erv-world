import { io, Socket } from 'socket.io-client';
import SimplePeer, { type Instance as PeerInstance, type SignalData } from 'simple-peer';
import { decode, encode } from '@msgpack/msgpack';
import { useNetworkStore } from '../store/networkStore';
import { useGameStore, pushPlayerUpdate, pushObjectUpdate } from '../store/gameStore';
import { PacketType, type GamePacket } from './Protocol';

const SIGNAL_SERVER_URL = import.meta.env.VITE_SIGNAL_SERVER_URL || 'http://localhost:3001';

/**
 * NetworkManager Singleton.
 * Manages the P2P lifecycle, Signaling, Room Creation, and Host Migration.
 */
class NetworkManager {
    private socket: Socket | null = null;
    private peers: Map<string, PeerInstance> = new Map();

    constructor() {
        this.initializeSignalConnection();
    }

    /**
     * Returns the local Socket ID, used as the unique Player ID.
     */
    public getSocketId(): string | undefined {
        return this.socket?.id;
    }

    private initializeSignalConnection(): void {
        this.socket = io(SIGNAL_SERVER_URL);

        this.socket.on('connect', () => {
            useNetworkStore.getState().setSignalStatus(true);
        });

        this.socket.on('disconnect', () => {
            useNetworkStore.getState().setSignalStatus(false);
            this.cleanupAllPeers();
        });

        this.socket.on('signal', ({ sender, signal }: { sender: string; signal: SignalData }) => {
            const peer = this.peers.get(sender);
            if (peer) {
                peer.signal(signal);
            } else {
                this.createPeer(sender, false, signal);
            }
        });

        this.socket.on('host:peer-joining', ({ peerId }: { peerId: string }) => {
            this.createPeer(peerId, true);
        });

        // Triggered by Server when the Host socket disconnects from the room.
        this.socket.on('room:host_left', () => {
            this.handleHostDisconnect();
        });
    }

    /**
     * Initializes a WebRTC connection with a remote peer.
     * @param targetId - The Socket ID of the remote peer.
     * @param initiator - Whether this client is initiating the connection (Caller vs Callee).
     * @param initialSignal - The SDP signal to process immediately, if any.
     */
    private createPeer(targetId: string, initiator: boolean, initialSignal?: SignalData): void {
        const peer = new SimplePeer({
            initiator,
            trickle: false,
        });

        peer.on('signal', (signal: SignalData) => {
            this.socket?.emit('signal', { target: targetId, signal });
        });

        peer.on('connect', () => {
            console.log(`[P2P] Connected to ${ targetId }`);
            useNetworkStore.getState().addPeer(targetId);

            // If we are Host, check if we need to assign a new Heir
            const { role } = useNetworkStore.getState();
            if (role === 'HOST') {
                this.updateHeir();
            }
        });

        peer.on('data', (data: Uint8Array) => {
            this.processIncomingData(targetId, data);
        });

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
     * Calculates the designated Heir (Backup Host) and broadcasts it to the lobby.
     * Rule: The first connected peer (Oldest Client) is the Heir.
     */
    private updateHeir() {
        const { peers } = useNetworkStore.getState();
        const currentHeir = useGameStore.getState().heirId;

        const newHeir = peers.length > 0 ? peers[0] : null;

        if (newHeir !== currentHeir) {
            useGameStore.getState().setHeirId(newHeir);

            this.broadcast({
                t: PacketType.LOBBY_STATE,
                d: { heirId: newHeir }
            });
            console.log(`[Host] Heir Updated: ${ newHeir }`);
        }
    }

    /**
     * Requests a new room code from the server and establishes Host status.
     * @returns True if room creation was successful.
     */
    public async createRoom(): Promise<boolean> {
        return new Promise((resolve) => {
            this.socket?.emit('host:create', (response: { success: boolean; code?: string }) => {
                if (response.success && response.code) {
                    useNetworkStore.getState().setRoomInfo(response.code, 'HOST');
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }

    /**
     * Joins an existing room by code.
     */
    public joinRoom(roomCode: string): void {
        this.socket?.emit('client:join', roomCode);
        useNetworkStore.getState().setRoomInfo(roomCode, 'CLIENT');
    }

    /**
     * Handles the logic when the Host disconnects.
     * Checks if local player is the Heir; if so, claims the room.
     * Otherwise, waits and rejoins to connect to the new Host.
     */
    private handleHostDisconnect() {
        const { role, roomCode } = useNetworkStore.getState();
        const { heirId } = useGameStore.getState();
        const myId = this.socket?.id;

        if (role !== 'CLIENT' || !roomCode || !myId) return;

        console.log(`[Migration] Host Disconnected. Heir is ${ heirId }`);

        // Cleanup current P2P connections as the Star topology has collapsed
        this.cleanupAllPeers(false); // false = Preserve Room Code in store

        if (heirId === myId) {
            // Promote to HOST
            console.log('[Migration] Promoting self to HOST and claiming room.');
            this.socket?.emit('host:claim', roomCode, (response: { success: boolean }) => {
                if (response.success) {
                    useNetworkStore.getState().setRoomInfo(roomCode, 'HOST');
                    // Peers are currently disconnected; they will reconnect shortly.
                } else {
                    console.error('[Migration] Claim failed. Falling back to offline.');
                    this.disconnect();
                }
            });
        } else {
            // Rejoin as CLIENT
            console.log('[Migration] Waiting for new Host...');
            // Random backoff (500-1500ms) to prevent thundering herd on the new Host
            const delay = 500 + Math.random() * 1000;
            setTimeout(() => {
                this.joinRoom(roomCode);
            }, delay);
        }
    }

    /**
     * Terminates the current session and resets state.
     * Called when the user manually clicks "Disconnect".
     */
    public disconnect() {
        // Send a polite goodbye packet so peers remove us immediately
        this.broadcast({ t: PacketType.DISCONNECT, d: null });
        this.cleanupAllPeers();
    }

    public send(targetId: string, packet: GamePacket): void {
        const peer = this.peers.get(targetId);
        if (peer?.connected) {
            const encoded = encode(packet);
            peer.send(encoded);
        }
    }

    public broadcast(packet: GamePacket): void {
        const encoded = encode(packet);
        this.peers.forEach((peer) => {
            if (peer.connected) {
                peer.send(encoded);
            }
        });
    }

    private processIncomingData(senderId: string, data: Uint8Array): void {
        try {
            const packet = decode(data) as GamePacket;

            switch (packet.t) {
                case PacketType.PLAYER_UPDATE:
                    pushPlayerUpdate(packet.d.id, {
                        timestamp: Date.now(),
                        position: packet.d.p,
                        velocity: packet.d.v,
                        rotation: packet.d.q,
                        animState: packet.d.a
                    });

                    // Lazy Discovery: Add unknown players to the store
                    const store = useGameStore.getState();
                    if (!store.players.find(p => p.id === packet.d.id)) {
                        store.addPlayer({
                            id: packet.d.id,
                            username: `Player ${ packet.d.id.slice(0, 4) }`,
                            isHost: false
                        });
                    }
                    break;

                case PacketType.LOBBY_STATE:
                    useGameStore.getState().setHeirId(packet.d.heirId);
                    break;

                case PacketType.DISCONNECT:
                    this.removePeer(senderId);
                    break;

                case PacketType.OBJECT_UPDATE:
                    pushObjectUpdate(packet.d.id, {
                        timestamp: Date.now(),
                        position: packet.d.p,
                        velocity: packet.d.v,
                        rotation: packet.d.q,
                        animState: 0
                    });
                    break;

                case PacketType.OBJECT_CLAIM:
                    useGameStore.getState().setObjectOwner(packet.d.netId, packet.d.ownerId);
                    break;

                case PacketType.GLOBAL_STATE:
                    const { type, val } = packet.d;
                    const gs = useGameStore.getState();
                    if (type === 0) gs.setGlobalState(gs.gameTime, val, gs.season);
                    else if (type === 1) gs.setGlobalState(val, gs.weather, gs.season);
                    else if (type === 2) gs.setGlobalState(gs.gameTime, gs.weather, val);
                    break;

                case PacketType.WORLD_TICK:
                    packet.d.p.forEach(p => {
                        pushPlayerUpdate(p.id, {
                            timestamp: packet.d.t,
                            position: p.p,
                            velocity: p.v,
                            rotation: p.q,
                            animState: p.a
                        });
                    });
                    if (packet.d.o) {
                        packet.d.o.forEach(o => {
                            pushObjectUpdate(o.id, {
                                timestamp: packet.d.t,
                                position: o.p,
                                velocity: o.v,
                                rotation: o.q,
                                animState: 0
                            });
                        });
                    }
                    break;

                default:
                    break;
            }

        } catch (err) {
            console.error('[Network] Packet Decode Error:', err);
        }
    }

    private removePeer(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.destroy();
            this.peers.delete(peerId);
        }
        useNetworkStore.getState().removePeer(peerId);
        useGameStore.getState().removePlayer(peerId);

        // Re-evaluate Heir if we are Host and the Heir left
        const { role } = useNetworkStore.getState();
        const { heirId } = useGameStore.getState();
        if (role === 'HOST' && peerId === heirId) {
            this.updateHeir();
        }
    }

    /**
     * Resets network state and cleans up connections.
     * @param resetRoomCode - Whether to clear the Room Code. Set to false during migration.
     */
    private cleanupAllPeers(resetRoomCode = true): void {
        this.peers.forEach((peer) => peer.destroy());
        this.peers.clear();

        const { roomCode } = useNetworkStore.getState();
        useNetworkStore.getState().reset();

        // If preserving room code (e.g. during migration), restore it after reset
        if (!resetRoomCode && roomCode) {
            useNetworkStore.getState().setRoomInfo(roomCode, 'NONE');
        }

        useGameStore.getState().reset();
    }
}

export const networkManager = new NetworkManager();
