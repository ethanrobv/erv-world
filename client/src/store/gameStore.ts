import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PhysicsEngine, type PhysicsSnapshot } from './PhysicsEngine';
import { networkManager } from '../network/NetworkManager';
import { PacketType } from '../network/Protocol';

interface PlayerMetadata {
    id: string;
    username: string;
    isHost: boolean;
}

/**
 * Reactive Game State.
 * Handles UI-relevant data and low-frequency logic updates.
 */
interface GameState {
    // Environment
    gameTime: number;
    weather: number;
    season: number;

    // Lobby
    players: PlayerMetadata[];
    /** The Socket ID of the peer designated to take over if the Host disconnects. */
    heirId: string | null;

    // Objects
    /**
     * Registry of Networked Objects.
     * Key: Network ID (e.g., 'crate_1').
     * Value: Owner ID (Socket ID). If undefined/null, implies HOST authority.
     */
    objectRegistry: Record<string, string | null>;

    // Actions
    setGlobalState: (time: number, weather: number, season: number) => void;
    addPlayer: (player: PlayerMetadata) => void;
    removePlayer: (id: string) => void;
    setHeirId: (id: string | null) => void;
    setObjectOwner: (objectId: string, ownerId: string | null) => void;

    /** Optimistically claims an object and notifies the network. */
    claimObject: (objectId: string) => void;

    reset: () => void;
}

export const useGameStore = create<GameState>()(
    subscribeWithSelector((set, get) => ({
        gameTime: 720,
        weather: 0,
        season: 0,
        players: [],
        heirId: null,
        objectRegistry: {},

        setGlobalState: (gameTime, weather, season) => set({ gameTime, weather, season }),

        addPlayer: (player) => set((state) => {
            if (state.players.find(p => p.id === player.id)) return state;
            return { players: [...state.players, player] };
        }),

        removePlayer: (id) => set((state) => ({
            players: state.players.filter((p) => p.id !== id)
        })),

        setHeirId: (id) => set({ heirId: id }),

        setObjectOwner: (objectId, ownerId) => set((state) => ({
            objectRegistry: {
                ...state.objectRegistry,
                [objectId]: ownerId
            }
        })),

        claimObject: (objectId) => {
            const localId = networkManager.getSocketId();
            if (!localId) return;

            // Optimistic Update
            set((state) => ({
                objectRegistry: { ...state.objectRegistry, [objectId]: localId }
            }));

            // Broadcast Claim
            networkManager.broadcast({
                t: PacketType.OBJECT_CLAIM,
                d: { netId: objectId, ownerId: localId }
            });
        },

        reset: () => set({
            players: [],
            objectRegistry: {},
            heirId: null,
            gameTime: 720,
            weather: 0,
            season: 0
        }),
    }))
);

// --- PHYSICS ENGINE WRAPPERS ---

export const physicsEngine = new PhysicsEngine();

export const pushPlayerUpdate = (id: string, update: PhysicsSnapshot) => {
    physicsEngine.pushUpdate(id, update);
};

export const pushObjectUpdate = (id: string, update: PhysicsSnapshot) => {
    physicsEngine.pushUpdate(id, update);
};

export const updateInterpolation = (serverTime: number) => {
    physicsEngine.update(serverTime);
};

export const getInterpolatedEntity = (id: string) => {
    return physicsEngine.getState(id);
};
