import { createContext, useContext } from 'react';
import { Peer } from 'peerjs';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */

/* -------------------------------------------------------------------------- */

interface NetworkContextType {
    peer: Peer | null;
    peerId: string | null;
}

/* -------------------------------------------------------------------------- */
/* CONTEXT CREATION                                                           */
/* -------------------------------------------------------------------------- */

export const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

/* -------------------------------------------------------------------------- */
/* CUSTOM HOOKS                                                               */
/* -------------------------------------------------------------------------- */

export const useNetwork = () => {
    const context = useContext(NetworkContext);
    if (!context) throw new Error('useNetwork must be used within NetworkProvider');
    return context;
};
