import { create } from 'zustand';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface Player {
    id: string;
    username: string;
    x: number;
    y: number;
    planetId: string;
}

interface GameState {
    // -- Session State --
    /**
     * Controls the lifecycle of the Phaser Game Engine.
     * False: Main Menu / Lobby (Canvas unmounted).
     * True: In-Game (Canvas mounted, Physics running).
     */
    hasGameStarted: boolean;
    roomId: string | null;
    connectionStatus: ConnectionStatus;

    // -- Local Identity --
    username: string;
    isHost: boolean;

    // -- World State --
    /**
     * The random seed used for deterministic map generation.
     * Shared by the Host to all Clients to ensure identical terrain.
     */
    worldSeed: string;
    currentPlanet: string;
    players: Player[]; // List of remote players

    // -- Actions --
    setHasGameStarted: (started: boolean) => void;
    /**
     * Sets the active Session/Room ID.
     * Accepts null to indicate no active session.
     */
    setRoomId: (id: string | null) => void
    setConnectionStatus: (status: ConnectionStatus) => void;

    /**
     * Sets the local user's display name.
     * @param name - The chosen username.
     */
    setUsername: (name: string) => void;

    /**
     * Flags whether the local client is the session Host.
     * @param isHost - True if Host, False if Client.
     */
    setIsHost: (isHost: boolean) => void;

    /**
     * Sets the shared world seed.
     * @param seed - The seed string received from the Host.
     */
    setWorldSeed: (seed: string) => void;

    addPlayer: (player: Player) => void;
    removePlayer: (id: string) => void;

    /**
     * Updates specific properties of a remote player.
     * @param id - The peer ID of the player to update.
     * @param updates - Partial object containing fields to update (e.g., just x/y).
     */
    updatePlayer: (id: string, updates: Partial<Player>) => void;

    setCurrentPlanet: (planetId: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
    hasGameStarted: false,
    roomId: null,
    connectionStatus: 'disconnected',
    username: 'Angler',
    isHost: false,

    // Default seed (overwritten by Host on init, or by Client on Sync)
    worldSeed: 'cosmic-default',
    currentPlanet: 'earth',
    players: [],

    setHasGameStarted: (started) => set({ hasGameStarted: started }),
    setRoomId: (id) => set({ roomId: id }),
    setConnectionStatus: (status) => set({ connectionStatus: status }),
    setUsername: (name) => set({ username: name }),
    setIsHost: (isHost) => set({ isHost }),
    setWorldSeed: (seed) => set({ worldSeed: seed }),

    addPlayer: (player) => set((state) => {
        // Prevent duplicate entries for the same ID
        if (state.players.find(p => p.id === player.id)) return state;
        return { players: [...state.players, player] };
    }),

    removePlayer: (id) => set((state) => ({
        players: state.players.filter((p) => p.id !== id)
    })),

    updatePlayer: (id, updates) => set((state) => ({
        players: state.players.map((p) =>
            p.id === id ? { ...p, ...updates } : p
        )
    })),

    setCurrentPlanet: (planetId) => set({ currentPlanet: planetId }),
}));
