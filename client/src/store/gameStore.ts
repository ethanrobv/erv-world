import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { PhysicsEngine, type PhysicsSnapshot } from './PhysicsEngine';
import { networkManager } from '../network/NetworkManager'; // [NEW] Import for optimistic broadcasting
import { PacketType } from '../network/Protocol';

// =============================================================================
// TIER 1: REACTIVE STATE (UI & LOGIC)
// Used by React Components (HUD, Menus) for low-frequency updates.
// =============================================================================

interface PlayerMetadata {
    id: string;
    username: string;
    isHost: boolean;
}

interface GameState {
    /** Global game time (0-1440 minutes). Reactive because it changes skybox colors. */
    gameTime: number;
    /** Weather state index. Reactive because it toggles particle systems. */
    weather: number;
    /** Season state index. Reactive because it changes textures. */
    season: number;

    /** List of active players. Reactive because the Lobby UI needs to list them. */
    players: PlayerMetadata[];

    /**
     * Registry of Networked Objects.
     * Key: Network ID (e.g., 'crate_1').
     * Value: Owner ID (Socket ID). If undefined/null, it implies HOST authority.
     */
    objectRegistry: Record<string, string | null>;

    // Actions
    setGlobalState: (time: number, weather: number, season: number) => void;
    addPlayer: (player: PlayerMetadata) => void;
    removePlayer: (id: string) => void;

    /** * Updates the registry locally (Response handling). */
    setObjectOwner: (objectId: string, ownerId: string | null) => void;

    /** * Optimistically claims an object and notifies the network. */
    claimObject: (objectId: string) => void;

    reset: () => void;
}

export const useGameStore = create<GameState>()(
    subscribeWithSelector((set, get) => ({
        gameTime: 720, // Default to Noon
        weather: 0,    // Clear
        season: 0,     // Warm
        players: [],
        objectRegistry: {},

        setGlobalState: (gameTime, weather, season) => set({ gameTime, weather, season }),

        addPlayer: (player) => set((state) => {
            if (state.players.find(p => p.id === player.id)) return state;
            return { players: [...state.players, player] };
        }),

        removePlayer: (id) => set((state) => ({
            players: state.players.filter((p) => p.id !== id)
        })),

        setObjectOwner: (objectId, ownerId) => set((state) => ({
            objectRegistry: {
                ...state.objectRegistry,
                [objectId]: ownerId
            }
        })),

        claimObject: (objectId) => {
            // 1. Get Local ID (Assuming the first player in list is 'me' or we need a proper ID source)
            // Ideally, we get the socket ID from the NetworkManager, but for now we rely on the store knowing 'me'.
            // For this implementation, we will fetch the ID directly from the Network store or Manager.
            const localId = networkManager.getSocketId();
            if (!localId) return;

            // 2. Optimistic Local Update
            set((state) => ({
                objectRegistry: { ...state.objectRegistry, [objectId]: localId }
            }));

            // 3. Network Broadcast
            networkManager.broadcast({
                t: PacketType.OBJECT_CLAIM,
                d: { netId: objectId, ownerId: localId }
            });
        },

        reset: () => set({ players: [], objectRegistry: {}, gameTime: 720, weather: 0, season: 0 }),
    }))
);

// =============================================================================
// TIER 2: TRANSIENT STATE (PHYSICS)
// =============================================================================

// 1. Create the Singleton Instance for the App
export const physicsEngine = new PhysicsEngine();

// 2. Expose the API wrappers (Optional, or just export physicsEngine directly)
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
