import { useState, useEffect, useCallback, useRef } from 'react';
import type { DataConnection } from 'peerjs';
import { useNetwork } from '../context/NetworkContext';
import { useWorkerInterval } from './useWorkerInterval';

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

export const useGameP2P = (
    onPeerJoined?: (id: string) => void,
    onPeerLeft?: (id: string) => void,
    heirId?: string | null
): GameP2PHook => {
    const { peer, peerId } = useNetwork();

    // State
    const [isHost, setIsHost] = useState(false);
    const [roomCode, setRoomCode] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [hostConn, setHostConn] = useState<DataConnection | null>(null);
    const [p2pError, setP2pError] = useState<string | null>(null);
    const [watchdogActive, setWatchdogActive] = useState(false);

    // Refs
    const roomCodeRef = useRef<string | null>(null);
    const heirIdRef = useRef<string | null>(null);
    const connectionsRef = useRef(connections);
    const hostConnRef = useRef(hostConn);
    const isHostRef = useRef(isHost);
    const peerIdRef = useRef(peerId);

    const hostLastSeenRef = useRef<number>(Date.now());
    const connectionStartRef = useRef<number>(0);
    const targetPeerIdRef = useRef<string | null>(null);
    const isConnectingRef = useRef(false);
    const failCurrentAttemptRef = useRef<(() => void) | null>(null);

    // Sync Refs
    useEffect(() => {
        roomCodeRef.current = roomCode;
    }, [roomCode]);
    useEffect(() => {
        heirIdRef.current = heirId || null;
    }, [heirId]);
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);
    useEffect(() => {
        hostConnRef.current = hostConn;
    }, [hostConn]);
    useEffect(() => {
        isHostRef.current = isHost;
    }, [isHost]);
    useEffect(() => {
        peerIdRef.current = peerId;
    }, [peerId]);

    // Cleanup
    useEffect(() => {
        const terminateSession = () => {
            const isHost = isHostRef.current;
            const roomCode = roomCodeRef.current;
            const peerId = peerIdRef.current;
            const activeConnections = connectionsRef.current.filter(c => c.open);

            // 1. Close connection to Host if we are a client
            if (hostConnRef.current?.open) {
                hostConnRef.current.close();
            }

            // 2. Close all client connections if we are the host
            connectionsRef.current.forEach(c => {
                if (c.open) c.close();
            });

            // 3. CLEANUP: If we are Host and the room is empty, tell server to delete it.
            // If connections exist, we do NOT delete, allowing clients to migrate via heartbeat failure.
            if (isHost && roomCode && activeConnections.length === 0) {
                const url = `/api/game/room/${ roomCode }`;
                // Use keepalive: true to ensure the request is sent even if the page is unloading
                fetch(url, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ peerId }),
                    keepalive: true
                }).catch(err => console.error('[P2P] Failed to clear empty room:', err));
            }
        };

        window.addEventListener('beforeunload', terminateSession);
        return () => {
            window.removeEventListener('beforeunload', terminateSession);
            terminateSession();
        };
    }, []);

    // API Utilities
    const claimRoom = useCallback(async (code: string) => {
        if (!peerId) return false;
        try {
            const res = await fetch(`/api/game/room/${ code }`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ peerId })
            });
            return res.status === 404 ? false : res.ok;
        } catch {
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
        } catch { /* ignore */
        }
        return null;
    }, []);

    // --- Watchdog & Heartbeat Logic ---

    // The watchdog now uses the worker to monitor host silence
    useWorkerInterval(() => {
        // We check hostConnRef to see if the connection WAS open or exists
        if (!hostConnRef.current) return;

        const now = Date.now();
        // Grace period for initial handshake
        if (now < connectionStartRef.current + 5000) return;

        // Check for silence OR if the connection object is no longer 'open'
        const isSilent = now - hostLastSeenRef.current > 2000;
        const isSocketClosed = !hostConnRef.current.open;

        if (isSilent || isSocketClosed) {
            console.warn('[WATCHDOG] Host lost (Silence or Socket Close). Triggering recovery.');

            // Disable watchdog immediately to prevent loops
            setWatchdogActive(false);

            // Force the recovery logic
            if (failCurrentAttemptRef.current) {
                failCurrentAttemptRef.current();
            }

            // Clean up the dead connection
            if (hostConnRef.current.open) {
                hostConnRef.current.close();
            }
        }
    }, watchdogActive ? 250 : null);

    // Host sends lightweight pings to keep client watchdogs alive
    useEffect(() => {
        if (!peer || !isHost) return;
        const heartbeat = setInterval(() => {
            connectionsRef.current.forEach(conn => {
                if (conn.open) conn.send({ type: 'HEARTBEAT' });
            });
        }, 1000);
        return () => clearInterval(heartbeat);
    }, [peer, isHost]);

    const setupGuestWatchdog = useCallback((conn: DataConnection) => {
        connectionStartRef.current = Date.now();
        hostLastSeenRef.current = Date.now();
        const onData = () => {
            hostLastSeenRef.current = Date.now();
        };
        conn.on('data', onData); // Any incoming data resets the watchdog
        setWatchdogActive(true);
        conn.on('close', () => {
            conn.off('data', onData);
        });
    }, []);

    // --- Connection Logic ---

    const connectToHost = useCallback((targetPeerId: string, targetRoomCode: string) => {
        if (!peer || !peerId) return;
        if (targetPeerId === peerId) {
            setIsHost(true);
            setRoomCode(targetRoomCode);
            return;
        }

        targetPeerIdRef.current = targetPeerId;
        isConnectingRef.current = true;
        const conn = peer.connect(targetPeerId, { reliable: true });

        const handleHostLost = () => {
            if (!isConnectingRef.current && !hostConnRef.current) return;

            isConnectingRef.current = false;
            setWatchdogActive(false);
            setHostConn(null);

            // The heir proactively claims the room
            if (heirIdRef.current === peerId) {
                console.log('[P2P] Promoting self to host...');
                void claimRoom(targetRoomCode).then((success) => {
                    if (success) {
                        setIsHost(true);
                        setRoomCode(targetRoomCode);
                    } else {
                        setIsHost(false);
                        console.log('[P2P] failed to promote.')
                    }
                });
            } else {
                // After slight delay, connect to new host (heir or signal server record)
                console.log('[P2P] Waiting for new host...');
                setTimeout(() => {
                    if (!heirIdRef.current) {
                        void getHostFromApi(targetRoomCode).then(serverHostId => {
                            if (serverHostId && serverHostId !== targetPeerId) {
                                connectToHost(serverHostId, targetRoomCode);
                            }
                        });
                    } else {
                        connectToHost(heirIdRef.current, targetRoomCode);
                    }
                }, 1000 + Math.random() * 500); // Even out re-connections
            }
        };

        failCurrentAttemptRef.current = handleHostLost; // Bridge for global errors

        conn.on('open', () => {
            isConnectingRef.current = false;
            setHostConn(conn);
            setRoomCode(targetRoomCode);
            setIsHost(false);
            setupGuestWatchdog(conn);
        });

        conn.on('error', (err) => {
            console.error('[P2P] Conn Error:', err);
            conn.close();
            handleHostLost();
        });

        conn.on('close', handleHostLost);

        setTimeout(() => {
            if (!conn.open && isConnectingRef.current && targetPeerIdRef.current === targetPeerId) {
                conn.close();
                handleHostLost();
            }
        }, 3000);
    }, [peer, peerId, claimRoom, getHostFromApi, setupGuestWatchdog, onPeerLeft]);

    // --- Global Peer Listeners ---

    useEffect(() => {
        if (!peer) return;
        const handleError = (err: any) => {
            if (['peer-unavailable', 'network'].includes(err.type)) {
                if (isConnectingRef.current && failCurrentAttemptRef.current) {
                    failCurrentAttemptRef.current(); // Immediately handle global connection errors
                }
            }
        };
        peer.on('error', handleError);
        return () => {
            peer.off('error', handleError);
        };
    }, [peer]);

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

    // Public Methods
    const startHosting = useCallback(async () => {
        if (!peerId) return;
        setP2pError(null);
        try {
            const res = await fetch('/api/game/host', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ peerId, action: 'CLAIM_ROOM' })
            });
            if (!res.ok) {
                console.log('[P2P] Failed to communicate with signal server')
            } else {
                const data = await res.json();
                setRoomCode(data.roomCode);
                setIsHost(true);
            }
        } catch {
            setP2pError('Failed to start hosting');
        }
    }, [peerId]);

    const joinRoom = useCallback(async (code: string) => {
        if (!peer) throw new Error();
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
        } catch (e) {
            setP2pError('Failed to join');
        }
    }, [peer, connectToHost]);

    return { peerId, isHost, roomCode, connections, hostConn, startHosting, joinRoom, p2pError };
};
