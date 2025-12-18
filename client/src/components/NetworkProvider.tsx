import { useEffect, useState, useRef, type ReactNode } from 'react';
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
        const peer = new Peer();

        peer.on('open', (id) => {
            setPeerId(id);
            console.log('My peer ID is: ' + id);
        });

        peer.on('error', (err) => {
            console.error('PeerJS Error:', err);
        });

        peerRef.current = peer;

        return () => {
            peer.destroy();
        };
    }, []);

    /* -------------------------------------------------------------------------- */
    /* PROVIDER RENDER                                                            */
    /* -------------------------------------------------------------------------- */

    return (
        <NetworkContext.Provider value={ { peer: peerRef.current, peerId } }>
            { children }
        </NetworkContext.Provider>
    );
}
