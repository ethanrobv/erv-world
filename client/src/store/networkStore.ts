import { create } from 'zustand';

/**
 * Valid network roles for a peer in the star topology.
 */
export type NetworkRole = 'HOST' | 'CLIENT' | 'NONE';

/**
 * State and actions for managing the peer-to-peer network status.
 */
interface NetworkState {
    /** Indicates if the client has a live connection to the Socket.io signal server. */
    isConnectedToSignal: boolean;

    /** The human-readable code for the current game lobby (e.g., 'XJ4P'). */
    roomCode: string | null;

    /** The authoritative role of the local player in the current session. */
    role: NetworkRole;

    /** An array of Socket IDs for all connected remote peers. */
    peers: string[];

    /**
     * Updates the signal server connection status.
     * @param status - True if connected to the signaling switchboard.
     */
    setSignalStatus: (status: boolean) => void;

    /**
     * Sets the session information after a successful room creation or join.
     * @param code - The room identifier.
     * @param role - The role assigned to the player.
     */
    setRoomInfo: (code: string, role: NetworkRole) => void;

    /**
     * Adds a new peer ID to the registry upon successful WebRTC connection.
     * @param peerId - The unique socket ID of the remote peer.
     */
    addPeer: (peerId: string) => void;

    /**
     * Removes a peer ID from the registry when the connection is closed.
     * @param peerId - The unique socket ID of the remote peer.
     */
    removePeer: (peerId: string) => void;

    /**
     * Resets the store to initial state.
     * Used when leaving a room or handling a total network disconnect.
     */
    reset: () => void;
}

/**
 * Global Network Store.
 * * DESIGN DECISIONS:
 * 1. Decoupled Logic: The NetworkManager (singleton) calls these actions to update the UI
 * state without needing to be wrapped in a React provider.
 * 2. Flat State: Keeps selectors simple and performant.
 * 3. Atomic Updates: Updates to 'peers' use functional state updates to prevent race conditions.
 */
export const useNetworkStore = create<NetworkState>((set) => ({
    isConnectedToSignal: false,
    roomCode: null,
    role: 'NONE',
    peers: [],

    setSignalStatus: (status) => set({ isConnectedToSignal: status }),

    setRoomInfo: (code, role) => set({
        roomCode: code,
        role
    }),

    addPeer: (peerId) => set((state) => {
        if (state.peers.includes(peerId)) return state;
        return { peers: [...state.peers, peerId] };
    }),

    removePeer: (peerId) => set((state) => ({
        peers: state.peers.filter((id) => id !== peerId)
    })),

    reset: () => set({
        roomCode: null,
        role: 'NONE',
        peers: []
    }),
}));
