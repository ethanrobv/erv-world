import { useState, useEffect, useCallback, useRef } from 'react';
import { type DataConnection } from 'peerjs';
import { useNetwork } from '../context/NetworkContext';

export const useGameP2P = (
    onPeerJoined?: (id: string) => void,
    onPeerLeft?: (id: string) => void,
    getPeerList?: () => string[]
) => {
    /* -------------------------------------------------------------------------- */
    /* STATE & REFS                                                               */
    /* -------------------------------------------------------------------------- */

    const { peer, peerId } = useNetwork();

    // Connection State
    const [isHost, setIsHost] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [hostConn, setHostConn] = useState<DataConnection | null>(null);

    // Refs for Event Listeners (avoids stale closures)
    const roomCodeRef = useRef<string | null>(null);
    const isHostRef = useRef(isHost);
    const hostLastSeenRef = useRef<number>(Date.now());

    // Sync State to Refs
    useEffect(() => {
        roomCodeRef.current = roomCode;
    }, [roomCode]);
    useEffect(() => {
        isHostRef.current = isHost;
    }, [isHost]);

    /* -------------------------------------------------------------------------- */
    /* API HELPERS & HEARTBEAT                                                    */
    /* -------------------------------------------------------------------------- */

    // Keep the room alive on the server
    useEffect(() => {
        if (!isHost || !roomCode || !peerId) return;
        const interval = setInterval(() => {
            fetch('/api/game/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, peerId })
            }).catch(() => {
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isHost, roomCode, peerId]);

    // Attempt to take over a room if the host dies
    const claimThrone = useCallback(async (code: string) => {
        if (!peerId) return false;
        try {
            const res = await fetch(`/api/game/room/${ code }`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ peerId })
            });
            return res.ok;
        } catch (e) {
            return false;
        }
    }, [peerId]);

    /* -------------------------------------------------------------------------- */
    /* HOST MIGRATION & WATCHDOG                                                  */
    /* -------------------------------------------------------------------------- */

    const setupGuestWatchdog = useCallback((conn: DataConnection) => {
        hostLastSeenRef.current = Date.now();
        const onData = () => {
            hostLastSeenRef.current = Date.now();
        };
        conn.on('data', onData);

        const interval = setInterval(() => {
            if (conn.open) {
                const timeSinceData = Date.now() - hostLastSeenRef.current;
                if (timeSinceData > 5000) {
                    console.warn('Host timed out (Watchdog). Forcing disconnect.');
                    conn.close();
                    clearInterval(interval);
                }
            } else {
                clearInterval(interval);
            }
        }, 1000);

        return () => {
            conn.off('data', onData);
            clearInterval(interval);
        };
    }, []);

    const handleHostMigration = useCallback(async (oldHostId: string) => {
        if (!peer || !peerId || !getPeerList || !roomCodeRef.current) return;

        console.log('Host disconnected. Election starting...');

        // Filter out old host & Sort to ensure deterministic next host
        const allPeers = getPeerList().filter(id => id !== oldHostId);
        allPeers.sort();

        const nextHostId = allPeers[0];

        // Guard: No candidates
        if (!nextHostId) {
            console.error('Migration Aborted: No candidates found.');
            return;
        }

        if (nextHostId === peerId) {
            console.log('Claiming room...');
            const attemptClaim = async (attempts = 0) => {
                const success = await claimThrone(roomCodeRef.current!);
                if (success) {
                    console.log('Room claimed.');
                    setIsHost(true);
                    setHostConn(null);
                } else if (attempts < 5) {
                    setTimeout(() => attemptClaim(attempts + 1), 1000);
                }
            };
            await attemptClaim();
        } else {
            console.log(`Connecting to new Host: ${ nextHostId }`);
            // Random delay to prevent hammering the new host instantly
            setTimeout(() => {
                if (isHostRef.current) return;
                const newConn = peer.connect(nextHostId, { reliable: true });
                newConn.on('open', () => setHostConn(newConn));
                newConn.on('close', () => {
                    setHostConn(null);
                    handleHostMigration(nextHostId);
                });
                setupGuestWatchdog(newConn);
            }, 1000 + Math.random() * 1000);
        }
    }, [peer, peerId, getPeerList, claimThrone, setupGuestWatchdog]);

    /* -------------------------------------------------------------------------- */
    /* EVENT LISTENERS (HOST SIDE)                                                */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        if (!peer || !isHost) return;
        const handleConnection = (conn: DataConnection) => {
            conn.on('open', () => {
                setConnections(prev => {
                    const others = prev.filter(c => c.peer !== conn.peer);
                    return [...others, conn];
                });
                if (onPeerJoined) onPeerJoined(conn.peer);
            });
            conn.on('close', () => {
                setConnections(prev => prev.filter(c => c.peer !== conn.peer));
                if (onPeerLeft) onPeerLeft(conn.peer);
            });
            conn.on('error', () => {
                setConnections(prev => prev.filter(c => c.peer !== conn.peer));
                if (onPeerLeft) onPeerLeft(conn.peer);
            });
        };
        peer.on('connection', handleConnection);
        return () => {
            peer.off('connection', handleConnection);
        };
    }, [peer, isHost, onPeerJoined, onPeerLeft]);

    /* -------------------------------------------------------------------------- */
    /* PUBLIC ACTIONS (JOIN/HOST)                                                 */
    /* -------------------------------------------------------------------------- */

    const startHosting = useCallback(async () => {
        if (!peerId) return;
        try {
            const res = await fetch('/api/game/host', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ peerId })
            });
            const data = await res.json();
            setRoomCode(data.roomCode);
            setIsHost(true);
        } catch (e) {
            console.error(e);
        }
    }, [peerId]);

    const joinRoom = useCallback(async (code: string) => {
        return new Promise<void>(async (resolve, reject) => {
            if (!peer) return reject('Peer not initialized');

            try {
                const res = await fetch('/api/game/room/' + code.toUpperCase());
                if (!res.ok) {
                    return reject('Failed to communicate with server');
                }
                const { hostId } = await res.json();

                console.log('Connecting to host:', hostId);
                const conn = peer.connect(hostId, { reliable: true });

                const cleanup = () => {
                    conn.off('open', onOpen);
                    conn.off('error', onError);
                    conn.off('close', onClose);
                    clearTimeout(timer);
                };

                const onOpen = () => {
                    cleanup();
                    setHostConn(conn);
                    setRoomCode(code.toUpperCase());
                    setIsHost(false);

                    setupGuestWatchdog(conn);
                    conn.on('close', () => {
                        console.log('Host connection lost.');
                        setHostConn(null);
                        // Tell Game to remove old host model
                        if (onPeerLeft) onPeerLeft(hostId);
                        handleHostMigration(hostId);
                    });

                    resolve();
                };

                const handleFailure = async (reason: string) => {
                    cleanup();
                    console.log(`Connection failed (${ reason }). Attempting recovery...`);
                    const claimed = await claimThrone(code.toUpperCase());
                    if (claimed) {
                        console.log('Recovery Successful: You are now the Host.');
                        setRoomCode(code.toUpperCase());
                        setIsHost(true);
                        resolve();
                    } else {
                        reject(reason);
                    }
                };

                const onError = (err: any) => handleFailure(err || 'Connection failed');
                const onClose = () => handleFailure('Closed during handshake');

                conn.on('open', onOpen);
                conn.on('error', onError);
                conn.on('close', onClose);

                const timer = setTimeout(() => {
                    conn.close();
                    handleFailure('Timeout');
                }, 4000);

            } catch (e) {
                reject(e);
            }
        });
    }, [peer, setupGuestWatchdog, handleHostMigration, claimThrone, onPeerLeft]);

    return { peerId, isHost, roomCode, connections, hostConn, startHosting, joinRoom };
};
