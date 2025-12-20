import { useState, useEffect, useCallback, useRef } from 'react';
import { type DataConnection } from 'peerjs';
import { useNetwork } from '../context/NetworkContext';
import { useWorkerInterval } from './useWorkerInterval';

// Helper interface for safe typing of PeerJS errors
interface PeerError extends Error {
  type: string;
}

export const useGameP2P = (
  onPeerJoined?: (id: string) => void,
  onPeerLeft?: (id: string) => void,
  heirId?: string | null
) => {
  const { peer, peerId } = useNetwork();

  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [hostConn, setHostConn] = useState<DataConnection | null>(null);
  const [p2pError, setP2pError] = useState<string | null>(null);

  const roomCodeRef = useRef<string | null>(null);
  const heirIdRef = useRef<string | null>(null);

  // Watchdog Refs
  const hostLastSeenRef = useRef<number>(Date.now());
  const connectionStartRef = useRef<number>(0);
  const targetPeerIdRef = useRef<string | null>(null);

  // Locks
  const isConnectingRef = useRef(false);
  const [watchdogActive, setWatchdogActive] = useState(false);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);
  useEffect(() => {
    heirIdRef.current = heirId || null;
  }, [heirId]);

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
      /* ignore */
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

    // Start the worker logic
    setWatchdogActive(true);

    conn.on('close', () => {
      setWatchdogActive(false);
      conn.off('data', onData);
    });
  }, []);

  /* -------------------------------------------------------------------------- */
  /* CONNECTION LOGIC                                                           */
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

      // Safe casting to check for specific PeerJS error properties
      const peerError = err as PeerError;

      if (peerError.type === 'peer-unavailable' || peerError.type === 'socket-closed' || peerError.type === 'network') {
        if (targetPeerIdRef.current && isConnectingRef.current) {
          console.warn('[P2P] Target unavailable. Triggering migration.');
          isConnectingRef.current = false;
        }
      }

      if (peerError.type === 'unavailable-id' || peerError.type === 'invalid-id') {
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
        throw new Error(`Server rejected request (${ res.status }): ${ errorBody }`);
      }

      const data = await res.json();
      setRoomCode(data.roomCode);
      setIsHost(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Host] Failed to start:', msg);
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
      const res = await fetch('/api/game/room/' + code.toUpperCase());
      if (!res.ok) {
        setP2pError('Room not found');
        return;
      }
      const { hostId } = await res.json();
      connectToHost(hostId, code.toUpperCase());
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[Join] Failed:', msg);
      setP2pError(msg || 'Failed to join');
    }
  }, [peer, connectToHost]);

  return { peerId, isHost, roomCode, connections, hostConn, startHosting, joinRoom, p2pError };
};
