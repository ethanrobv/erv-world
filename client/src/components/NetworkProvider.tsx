import { useEffect, useState, useRef, useMemo, type ReactNode } from 'react';
import { Peer } from 'peerjs';
import { NetworkContext } from '../context/NetworkContext';

export function NetworkProvider({ children }: { children: ReactNode }) {
    /* -------------------------------------------------------------------------- */
    /* STATE & REFS                                                               */
    /* -------------------------------------------------------------------------- */

    const [peerId, setPeerId] = useState<string | null>(null);
    const peerRef = useRef<Peer | null>(null);

    /* -------------------------------------------------------------------------- */
    /* LIFECYCLE: PEER INITIALIZATION                                             */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        // Initialize PeerJS
        const peer = new Peer();

        peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            // This state update will trigger a re-render,
            // allowing the context to expose the now-ready peerRef.current
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

    /* -------------------------------------------------------------------------- */
    /* PROVIDER RENDER                                                            */
    /* -------------------------------------------------------------------------- */

    // Memoize the value to prevent unnecessary re-renders in consumers
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
