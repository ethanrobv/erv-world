import { useEffect, useState, useRef, useMemo, type ReactNode } from 'react';
import { Peer } from 'peerjs';
import { NetworkContext } from '../context/NetworkContext';

/**
 * A Context Provider that initializes and manages the local PeerJS instance.
 * It handles the lifecycle of the Peer connection (creation, ID assignment, destruction)
 * and exposes the Peer instance to the rest of the application via `useNetwork`.
 */
export function NetworkProvider({ children }: { children: ReactNode }) {
    const [peerId, setPeerId] = useState<string | null>(null);
    const peerRef = useRef<Peer | null>(null);

    useEffect(() => {
        // Initialize PeerJS
        const peer = new Peer();

        peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            setPeerId(id);
        });

        peer.on('error', (err) => {
            console.error('PeerJS Error:', err);
        });

        peerRef.current = peer;

        return () => {
            peer.destroy();
            peerRef.current = null;
        };
    }, []);

    const contextValue = useMemo(() => ({
        peer: peerRef.current,
        peerId
    }), [peerId]);

    return (
        <NetworkContext.Provider value={ contextValue }>
            { children }
        </NetworkContext.Provider>
    );
}
