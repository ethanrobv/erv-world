import { useState, useEffect, useCallback, useRef } from 'react';
import type { DataConnection } from 'peerjs';
import { useNetwork } from '../context/NetworkContext';
import { useWorkerInterval } from './useWorkerInterval';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */

/* -------------------------------------------------------------------------- */

interface PeerError extends Error {
    type: string;
}

interface GameP2PHook {
    peerId: string | null;
    isHost: boolean;
    roomCode: string | null;
    connections: DataConnection[];
    hostConn: DataConnection | null;
    p2pError: string | null;
    startHosting: () => Promise<void>;
    joinRoom: (code: string) => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* HOOK DEFINITION                                                            */
/* -------------------------------------------------------------------------- */

export const useGameP2P = (
    onPeerJoined?: (id: string) => void,
    onPeerLeft?: (id: string) => void,
    heirId?: string | null
): GameP2PHook => {
    const { peer, peerId } = useNetwork();

    // -- State ---------------------------------------------------------------
    const [isHost, setIsHost] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [hostConn, setHostConn] = useState<DataConnection | null>(null);
    const [p2pError, setP2pError] = useState<string | null>(null);

    // -- Refs (Mutable state for logic outside render cycle) ------------------
    const roomCodeRef = useRef<string | null>(null);
    const heirIdRef = useRef<string | null>(null);

    // Track connections for unmount cleanup
    const connectionsRef = useRef(connections);
    const hostConnRef = useRef(hostConn);

    // Watchdog Timers
    const hostLastSeenRef = useRef<number>(Date.now());
    const connectionStartRef = useRef<number>(0);
    const targetPeerIdRef = useRef<string | null>(null);

    // Locks & Flags
    const isConnectingRef = useRef(false);
    const [watchdogActive, setWatchdogActive] = useState(false);

    // Sync refs with state/props
    useEffect(() => {
        roomCodeRef.current = roomCode;
    }, [roomCode]);

    useEffect(() => {
        heirIdRef.current = heirId || null;
    }, [heirId]);

    // Keep connection refs in sync for cleanup
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    useEffect(() => {
        hostConnRef.current = hostConn;
    }, [hostConn]);

    /* -------------------------------------------------------------------------- */
    /* UNMOUNT / CLOSE CLEANUP                                                    */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        const terminateSession = () => {
            // Check if there is actually anything to clean up.
            // This prevents logs/logic from running during React Strict Mode's
            // immediate mount/unmount cycle when opening the widget.
            const hasActiveHost = hostConnRef.current && hostConnRef.current.open;
            const hasActiveClients = connectionsRef.current.some(c => c.open);

            if (!hasActiveHost && !hasActiveClients) return;

            console.log('[P2P] Game Widget/Window closing. Terminating session...');

            // 1. If we are a Guest, disconnect from the Host.
            if (hostConnRef.current && hostConnRef.current.open) {
                hostConnRef.current.close();
            }

            // 2. If we are the Host, close connections to all Clients.
            connectionsRef.current.forEach((conn) => {
                if (conn.open) {
                    conn.close();
                }
            });
        };

        // Handle Browser Tab Close
        window.addEventListener('beforeunload', terminateSession);

        // Handle React Component Unmount (Widget Close)
        return () => {
            window.removeEventListener('beforeunload', terminateSession);
            terminateSession();
        };
    }, []);

    /* -------------------------------------------------------------------------- */
    /* SERVER HEARTBEAT                                                           */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        if (!isHost || !roomCode || !peerId) return;

        const interval = setInterval(() => {
            void fetch('/api/game/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomCode, peerId })
            }).catch(() => {
                // Heartbeat failure is silent
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [isHost, roomCode, peerId]);

    /* -------------------------------------------------------------------------- */
    /* API HELPERS                                                                */
    /* -------------------------------------------------------------------------- */

    const claimThrone = useCallback(async (code: string) => {
        if (!peerId) return false;
        try {
            await fetch(`/api/game/room/${ code }`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ peerId })
            });
            return true;
        } catch {
            console.warn('[API] Claim failed. Proceeding as Host locally.');
            return false;
        }
    }, [peerId]);

    const getHostFromApi = useCallback(async (code: string) => {
        try {
            const res = await fetch(`/api/game/room/${ code }`);
            if (res.ok) {
                const data = await res.json();
                return data.hostId as string;
            }
        } catch {
            /* ignore fetch errors */
        }
        return null;
    }, []);

    /* -------------------------------------------------------------------------- */
    /* WORKER-POWERED WATCHDOG                                                    */
    /* -------------------------------------------------------------------------- */

    useWorkerInterval(() => {
        if (!hostConn || !hostConn.open) return;

        const now = Date.now();

        // 1. IMMUTABLE GRACE PERIOD (5s)
        if (now < connectionStartRef.current + 5000) return;

        // 2. STRICT TIMEOUT (2s)
        if (now - hostLastSeenRef.current > 2000) {
            console.warn('[WATCHDOG] Host silent > 2s. Disconnecting.');
            hostConn.close();
            setWatchdogActive(false);
        }
    }, watchdogActive ? 250 : null);

    const setupGuestWatchdog = useCallback((conn: DataConnection) => {
        connectionStartRef.current = Date.now();
        hostLastSeenRef.current = Date.now();

        const onData = () => {
            hostLastSeenRef.current = Date.now();
        };

        conn.on('data', onData);
        setWatchdogActive(true);

        conn.on('close', () => {
            setWatchdogActive(false);
            conn.off('data', onData);
        });
    }, []);

    /* -------------------------------------------------------------------------- */
    /* CONNECTION LOGIC & MIGRATION                                               */
    /* -------------------------------------------------------------------------- */

    const connectToHost = useCallback((targetPeerId: string, targetRoomCode: string, retryCount = 0) => {
        if (!peer || !peerId) return;
        if (targetPeerId === peerId) return;

        if (hostConn && hostConn.peer === targetPeerId && hostConn.open) return;
        if (isConnectingRef.current && retryCount === 0) return;

        targetPeerIdRef.current = targetPeerId;
        isConnectingRef.current = true;
        console.log(`[P2P] Connecting to Host: ${ targetPeerId } (Attempt ${ retryCount + 1 })`);

        const conn = peer.connect(targetPeerId, { reliable: true });

        const onOpen = () => {
            console.log('[P2P] Connected.');
            isConnectingRef.current = false;
            setHostConn(conn);
            setRoomCode(targetRoomCode);
            setIsHost(false);
            setupGuestWatchdog(conn);
        };

        const handleHostLost = () => {
            console.log('[P2P] Host connection lost/failed.');
            setWatchdogActive(false);
            setHostConn(null);
            isConnectingRef.current = false;
            if (onPeerLeft) onPeerLeft(targetPeerId);

            const currentHeir = heirIdRef.current;

            if (currentHeir) {
                if (currentHeir === peerId) {
                    console.log('[MIGRATION] I am Heir. Promoting.');
                    setIsHost(true);
                    void claimThrone(targetRoomCode);
                } else {
                    console.log(`[MIGRATION] Connecting to Heir: ${ currentHeir }`);
                    setTimeout(() => {
                        connectToHost(currentHeir, targetRoomCode);
                    }, 100 + Math.random() * 200);
                }
                return;
            }

            void getHostFromApi(targetRoomCode).then((serverHostId) => {
                if (serverHostId && serverHostId !== targetPeerId) {
                    console.log(`[MIGRATION] Server points to: ${ serverHostId }`);
                    connectToHost(serverHostId, targetRoomCode);
                } else {
                    console.warn('[MIGRATION] Room lost. Taking over.');
                    setIsHost(true);
                    void claimThrone(targetRoomCode);
                }
            });
        };

        conn.on('close', handleHostLost);
        conn.on('error', (err) => {
            console.error('[P2P] Conn Error:', err);
            conn.close();
        });
        conn.on('open', onOpen);

        setTimeout(() => {
            if (!conn.open && !isHost && isConnectingRef.current && targetPeerIdRef.current === targetPeerId) {
                console.warn('[P2P] Timeout. Aborting.');
                conn.close();
                handleHostLost();
            }
        }, 5000);

    }, [peer, peerId, setupGuestWatchdog, onPeerLeft, claimThrone, isHost, hostConn, getHostFromApi]);

    /* -------------------------------------------------------------------------- */
    /* PEER LIFECYCLE                                                             */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        if (!peer) return;

        const handleDisconnected = () => peer.reconnect();

        const handleError = (err: unknown) => {
            console.error('[Peer] Error:', err);
            const peerError = err as PeerError;

            if (['peer-unavailable', 'socket-closed', 'network'].includes(peerError.type)) {
                if (targetPeerIdRef.current && isConnectingRef.current) {
                    console.warn('[P2P] Target unavailable. Triggering migration.');
                    isConnectingRef.current = false;
                }
            }

            if (['unavailable-id', 'invalid-id'].includes(peerError.type)) {
                isConnectingRef.current = false;
                setP2pError(`Network Error: ${ peerError.type }`);
            }
        };

        peer.on('disconnected', handleDisconnected);
        peer.on('error', handleError);

        return () => {
            peer.off('disconnected', handleDisconnected);
            peer.off('error', handleError);
        };
    }, [peer]);

    /* -------------------------------------------------------------------------- */
    /* GHOST RECOVERY                                                             */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        if (!isHost || !heirId || heirId === peerId) return;

        if (connections.length === 0) {
            console.log('[P2P] Ghost Host detected. Abdicating.');
            setIsHost(false);
            setConnections([]);
            setTimeout(() => {
                if (roomCodeRef.current) connectToHost(heirId, roomCodeRef.current);
            }, 500);
        }
    }, [isHost, heirId, peerId, connections.length, connectToHost]);

    /* -------------------------------------------------------------------------- */
    /* HOST LISTENERS                                                             */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        if (!peer || !isHost) return;

        const handleConnection = (conn: DataConnection) => {
            conn.on('open', () => {
                setConnections(prev => prev.some(c => c.peer === conn.peer) ? prev : [...prev, conn]);
                if (onPeerJoined) onPeerJoined(conn.peer);
            });

            const handleClose = () => {
                setConnections(prev => prev.filter(c => c.peer !== conn.peer));
                if (onPeerLeft) onPeerLeft(conn.peer);
            };

            conn.on('close', handleClose);
            conn.on('error', handleClose);
        };

        peer.on('connection', handleConnection);
        return () => {
            peer.off('connection', handleConnection);
        };
    }, [peer, isHost, onPeerJoined, onPeerLeft]);

    /* -------------------------------------------------------------------------- */
    /* PUBLIC ACTIONS                                                             */
    /* -------------------------------------------------------------------------- */

    const startHosting = useCallback(async () => {
        if (!peerId) return;
        setP2pError(null);

        try {
            const res = await fetch('/api/game/host', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ peerId })
            });

            if (!res.ok) {
                const errorBody = await res.text().catch(() => res.statusText);
                const errorMsg = `Server rejected request (${ res.status }): ${ errorBody }`;
                console.error('[Host] Failed to start:', errorMsg);
                setP2pError(errorMsg);
                return;
            }

            const data = await res.json();
            setRoomCode(data.roomCode);
            setIsHost(true);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('[Host] Unexpected error:', msg);
            setP2pError(msg || 'Failed to start hosting');
        }
    }, [peerId]);

    const joinRoom = useCallback(async (code: string) => {
        if (!peer) throw new Error('Peer not ready');
        setIsHost(false);
        setHostConn(null);
        setConnections([]);
        setWatchdogActive(false);
        isConnectingRef.current = false;
        setP2pError(null);

        try {
            const normalizedCode = code.toUpperCase();
            const res = await fetch(`/api/game/room/${ normalizedCode }`);

            if (!res.ok) {
                setP2pError('Room not found');
                return;
            }

            const { hostId } = await res.json();
            connectToHost(hostId, normalizedCode);
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('[Join] Failed:', msg);
            setP2pError(msg || 'Failed to join');
        }
    }, [peer, connectToHost]);

    return {
        peerId,
        isHost,
        roomCode,
        connections,
        hostConn,
        startHosting,
        joinRoom,
        p2pError
    };
};
