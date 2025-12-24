import { createContext, useContext } from 'react';
import type { Peer } from 'peerjs';

/**
 * Defines the shape of the Network Context.
 * @property peer - The current PeerJS instance, or null if not initialized.
 * @property peerId - The unique ID assigned to this client by the PeerServer.
 */
export interface NetworkContextType {
    peer: Peer | null;
    peerId: string | null;
}

/**
 * Context for sharing PeerJS network state across the application.
 * Initialized as undefined to ensure usage strictly within the Provider.
 */
export const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

/**
 * Custom hook to access the PeerJS network state.
 *
 * @throws {Error} If used outside a <NetworkProvider>.
 * @returns {NetworkContextType} The current peer instance and peer ID.
 */
export const useNetwork = (): NetworkContextType => {
    const context = useContext(NetworkContext);

    if (!context) {
        throw new Error('useNetwork must be used within NetworkProvider');
    }

    return context;
};
