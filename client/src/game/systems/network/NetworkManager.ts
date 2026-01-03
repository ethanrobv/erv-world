import Peer, { DataConnection } from 'peerjs';
import { Game } from 'phaser';
import { GameEvents } from '@/game/core/GameEvents';
import { useGameStore } from '@/lib/stores/useGameStore';
import { BasePlanetScene } from '@/game/scenes/BasePlanetScene';
import {
    PacketType,
    GamePacket,
    PlayerMovePacket,
    WarpPacket,
    SyncRequestPacket,
    SyncResponsePacket,
    PlayerLeavePacket
} from './PacketTypes';

/**
 * Defines the strict input structure for sending packets.
 * We explicitly omit 'senderId' from each interface individually.
 * This preserves the Discriminated Union, ensuring strict typing for payloads.
 */
export type OutboundPacket =
    | Omit<PlayerMovePacket, 'senderId'>
    | Omit<WarpPacket, 'senderId'>
    | Omit<SyncRequestPacket, 'senderId'>
    | Omit<SyncResponsePacket, 'senderId'>
    | Omit<PlayerLeavePacket, 'senderId'>;

/**
 * Singleton Network Manager handling P2P connections via PeerJS.
 * Implements a Star Topology where the Host acts as the central relay.
 * Manages game state synchronization, packet routing, and connection error handling.
 */
export class NetworkManager {
    private static instance: NetworkManager;
    private peer: Peer | null = null;
    private connections: Map<string, DataConnection> = new Map();

    // Reference to the Phaser Game instance allows the Host to query scene state for syncing
    private gameInstance: Game | null = null;

    public isHost: boolean = false;
    public myPeerId: string = '';

    private constructor() {
    }

    /**
     * Retrieves the singleton instance.
     */
    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    /**
     * Sets the Phaser Game instance.
     * Required for the Host to access scene data during State Synchronization.
     */
    public setGame(game: Game): void {
        this.gameInstance = game;
        console.log('[Network] Game Instance Registered.');
    }

    /**
     * Initialize PeerJS and establish identity.
     * Sets up global error listeners for the Peer instance.
     */
    public async init(): Promise<string> {
        if (this.peer) return this.myPeerId;

        return new Promise((resolve, reject) => {
            try {
                this.peer = new Peer();

                this.peer.on('open', (id) => {
                    console.log(`[Network] Peer ID assigned: ${ id }`);
                    this.myPeerId = id;
                    resolve(id);
                });

                this.peer.on('connection', (conn) => this.handleConnection(conn));

                this.peer.on('error', (err) => {
                    console.error('[Network] Peer Error:', err);
                    GameEvents.emit('NETWORK_ERROR', err);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    public hostGame(): void {
        this.isHost = true;
        // Generate a deterministic seed for this session
        const sessionSeed = Math.random().toString(36).substring(7);
        useGameStore.getState().setWorldSeed(sessionSeed);
        console.log(`[Network] Hosting session. Seed: ${ sessionSeed }`);
    }

    public connectToHost(hostId: string): void {
        this.isHost = false;
        if (!this.peer) return;

        console.log(`[Network] Connecting to Host: ${ hostId }`);
        const conn = this.peer.connect(hostId);

        // Attach immediate error handler for connection failures
        conn.on('error', (err) => {
            console.error('[Network] Connection Error:', err);
            GameEvents.emit('NETWORK_ERROR', err);
        });

        this.handleConnection(conn);
    }

    /**
     * Sends a packet to the network.
     * Accepts a strictly typed OutboundPacket (no senderId), injects the ID, and dispatches.
     * @param packet - The payload containing the type and specific data fields.
     */
    public send(packet: OutboundPacket): void {
        if (!this.myPeerId) return;

        // Construct the full GamePacket
        const fullPacket = { ...packet, senderId: this.myPeerId } as GamePacket;

        if (this.isHost) {
            this.broadcast(fullPacket);
        } else {
            this.connections.forEach((conn) => {
                if (conn.open) conn.send(fullPacket);
            });
        }
    }

    /**
     * Sends a packet to a specific peer (Host Only).
     * Used for responding to Sync Requests directly.
     */
    private sendTo(targetPeerId: string, packet: OutboundPacket): void {
        const conn = this.connections.get(targetPeerId);
        if (conn && conn.open) {
            const fullPacket = { ...packet, senderId: this.myPeerId } as GamePacket;
            conn.send(fullPacket);
        }
    }

    /**
     * Relays a packet to all connected clients (Host Logic).
     */
    private broadcast(packet: GamePacket, excludeSenderId?: string): void {
        this.connections.forEach((conn, peerId) => {
            if (conn.open && peerId !== excludeSenderId) {
                conn.send(packet);
            }
        });
    }

    private handleConnection(conn: DataConnection): void {
        conn.on('open', () => {
            console.log(`[Network] Connected to: ${ conn.peer }`);
            this.connections.set(conn.peer, conn);

            // If we are a client connecting to a host, request the world state immediately
            if (!this.isHost) {
                console.log('[Network] Requesting World Sync...');
                this.send({ type: PacketType.SYNC_REQUEST });
            }
        });

        conn.on('data', (data) => this.handlePacket(data as GamePacket));

        conn.on('close', () => {
            console.log(`[Network] Connection Closed: ${ conn.peer }`);
            this.connections.delete(conn.peer);
            GameEvents.emit('PLAYER_LEAVE', { id: conn.peer });
        });

        conn.on('error', (err) => {
            console.error(`[Network] Connection Error with ${ conn.peer }:`, err);
            this.connections.delete(conn.peer);
            GameEvents.emit('NETWORK_ERROR', err);
        });
    }

    private handlePacket(packet: GamePacket): void {
        // 1. Host Relay Logic
        // We relay packets to other clients unless it's a direct Host-Client handshake (SYNC)
        if (this.isHost && packet.senderId !== this.myPeerId) {
            if (packet.type !== PacketType.SYNC_REQUEST && packet.type !== PacketType.SYNC_RESPONSE) {
                this.broadcast(packet, packet.senderId);
            }
        }

        // 2. Packet Processing
        switch (packet.type) {
            case PacketType.PLAYER_MOVE:
                GameEvents.emit('REMOTE_MOVE', packet);
                break;

            case PacketType.WARP_INIT:
                GameEvents.emit('WARP_COMMAND', packet);
                break;

            case PacketType.SYNC_REQUEST:
                // Only Host handles sync requests
                if (this.isHost && packet.senderId) {
                    this.sendSyncResponse(packet.senderId);
                }
                break;

            case PacketType.SYNC_RESPONSE:
                this.handleSyncResponse(packet);
                break;

            case PacketType.PLAYER_LEAVE:
                GameEvents.emit('PLAYER_LEAVE', { id: packet.senderId });
                break;
        }
    }

    /**
     * HOST LOGIC: Gathers current game state (Seed, Planet, Players) and sends it to the new client.
     * Uses retry logic if the Game Instance is not yet fully mounted.
     */
    private sendSyncResponse(targetPeerId: string, retryCount = 0): void {
        // Retry logic: Wait up to 2.5 seconds (5 attempts) for the Game Instance to mount.
        if (!this.gameInstance) {
            if (retryCount < 5) {
                console.warn(`[Network] Game Instance not ready for Sync. Retrying (${ retryCount + 1 }/5)...`);
                setTimeout(() => this.sendSyncResponse(targetPeerId, retryCount + 1), 500);
            } else {
                console.error('[Network] Sync Timeout: Sending partial state (Map Only).');
                // Fallback: Send sync without player data so client at least loads map
                this.sendTo(targetPeerId, {
                    type: PacketType.SYNC_RESPONSE,
                    seed: useGameStore.getState().worldSeed,
                    currentPlanet: useGameStore.getState().currentPlanet,
                    players: []
                });
            }
            return;
        }

        const store = useGameStore.getState();
        const currentPlanet = store.currentPlanet;
        const playerList: any[] = [];

        // If Game Instance is ready, get exact positions
        if (this.gameInstance) {
            const sceneKey = currentPlanet === 'earth' ? 'EarthScene' : 'MarsScene';
            const scene = this.gameInstance.scene.getScene(sceneKey) as BasePlanetScene;

            // 1. Add Host (Self)
            // We use 'as any' to access the new 'currentDir' property on the entity
            if (scene && scene.player) {
                playerList.push({
                    id: this.myPeerId,
                    username: store.username,
                    x: scene.player.x,
                    y: scene.player.y,
                    anim: scene.player.anims.currentAnim?.key || 'idle-down',
                    direction: (scene.player as any).currentDir || 'down', // Pass direction
                    planetId: currentPlanet
                });
            }
        }

        // 2. Add other Remote Players (from Store)
        // Note: For simplicity in the snapshot, we might pull their last known state from the Store
        // if we were storing extended state there. For now, we rely on their last packet or default.
        store.players.forEach(p => {
            if (p.id !== targetPeerId && p.id !== this.myPeerId) {
                playerList.push({
                    id: p.id,
                    username: p.username,
                    x: p.x,
                    y: p.y,
                    anim: 'idle-down',
                    direction: 'down',
                    planetId: p.planetId // Include planetId for filtering
                });
            }
        });

        console.log(`[Network] Sending Sync Snapshot to ${ targetPeerId }`);

        this.sendTo(targetPeerId, {
            type: PacketType.SYNC_RESPONSE,
            seed: store.worldSeed,
            currentPlanet: currentPlanet,
            players: playerList
        });
    }

    /**
     * CLIENT LOGIC: Receives world state from Host and hydrates the game.
     * This is where the game engine is actually started for Clients.
     */
    private handleSyncResponse(packet: SyncResponsePacket): void {
        console.log(`[Network] Received World Sync. Seed: ${ packet.seed } Planet: ${ packet.currentPlanet }`);

        const store = useGameStore.getState();

        // 1. Commit State
        store.setWorldSeed(packet.seed);
        store.setCurrentPlanet(packet.currentPlanet);
        store.setConnectionStatus('connected');

        // 2. START ENGINE
        // If the game hasn't started yet (normal join), we start it now that we have the seed.
        if (!store.hasGameStarted) {
            store.setHasGameStarted(true);
        } else {
            // If it WAS started (e.g. late rejoin), force a warp to refresh the map with new seed
            GameEvents.emit('WARP_COMMAND', { planetId: packet.currentPlanet });
        }

        // 3. Spawn Players
        // We delay slightly to ensure the scene is ready/mounted before emitting move events
        setTimeout(() => {
            packet.players.forEach(p => {
                GameEvents.emit('REMOTE_MOVE', {
                    type: PacketType.PLAYER_MOVE,
                    senderId: p.id,
                    username: p.username,
                    x: p.x,
                    y: p.y,
                    anim: p.anim,
                    direction: p.direction,
                    planetId: p.planetId
                });
            });
        }, 500);
    }
}
