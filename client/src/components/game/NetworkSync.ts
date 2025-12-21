import React, { useRef, useEffect } from 'react';
import type { DataConnection } from 'peerjs';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorkerInterval } from '../../hooks/useWorkerInterval';
import type { GameState, PlayerPose, SceneType, BJGameState, RemotePlayerState } from './GameConfig';

interface NetworkSyncProps {
    playerRef: React.RefObject<THREE.Group | null>;
    visualsRef: React.RefObject<THREE.Group | null>;
    peerId: string | null;
    isHost: boolean;
    hostConn: DataConnection | null;
    connections: DataConnection[];
    gameState: GameState;

    // [CHANGED] Now a Ref object instead of string | null
    interactionRef: React.MutableRefObject<{ label: string | null }>;

    playerPose: PlayerPose;
    setRemotePlayers: React.Dispatch<React.SetStateAction<Record<string, RemotePlayerState>>>;
    worldStateRef: React.RefObject<Record<string, RemotePlayerState>>;
    currentScene: SceneType;
    addAlert: (msg: string) => void;
    bjState: BJGameState;
    setPing?: (ping: number) => void;
    playerName: string;
    syncData?: Record<string, any>;
}

export function NetworkSync({
                                playerRef,
                                visualsRef,
                                peerId,
                                isHost,
                                hostConn,
                                connections,
                                gameState,
                                interactionRef, // [NEW]
                                playerPose,
                                setRemotePlayers,
                                worldStateRef,
                                currentScene,
                                addAlert,
                                bjState,
                                setPing,
                                playerName,
                                syncData = {},
                            }: NetworkSyncProps) {
    const lastBroadcastRef = useRef(0);
    const lastPruneRef = useRef(0);

    const BROADCAST_RATE_MS = 33; // ~30 updates per second
    const PRUNE_CHECK_RATE_MS = 500;
    const TIMEOUT_MS = 4000;

    const connectionsRef = useRef(connections);
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    // Host Heartbeat
    useWorkerInterval(() => {
        if (!isHost) return;
        const now = Date.now();
        if (now - lastBroadcastRef.current > 500) {
            connectionsRef.current.forEach((conn) => {
                if (conn.open) conn.send({ type: 'HEARTBEAT' });
            });
        }
    }, isHost ? 500 : null);

    // Client Ping
    useWorkerInterval(() => {
        if (isHost || !hostConn || !hostConn.open) return;
        hostConn.send({ type: 'PING', timestamp: Date.now() });
    }, 1000);

    // Ping/Pong Handling
    useEffect(() => {
        if (isHost || !hostConn || !setPing) return;
        const handler = (data: any) => {
            if (data.type === 'PONG') {
                setPing(Date.now() - data.timestamp);
            }
        };
        hostConn.on('data', handler);
        return () => {
            hostConn.off('data', handler);
        };
    }, [isHost, hostConn, setPing]);

    // Main Sync Loop
    useFrame(() => {
        if (gameState !== 'playing' || !playerRef.current || !peerId) return;

        const nowMs = Date.now();
        const shouldSend = (nowMs - lastBroadcastRef.current) > BROADCAST_RATE_MS;

        // 1. Build Local Player Payload
        const myPayload: RemotePlayerState = {
            pos: [
                playerRef.current.position.x,
                playerRef.current.position.y,
                playerRef.current.position.z
            ] as [number, number, number],
            rot: visualsRef.current?.rotation.y || 0,
            pose: playerPose,

            // [OPTIMIZATION] Read from ref
            interaction: interactionRef.current.label,

            scene: currentScene,
            lastSeen: nowMs,
            name: playerName,
            meta: syncData
        };

        if (isHost) {
            // Update Host's own record
            const existing = worldStateRef.current[peerId];
            worldStateRef.current[peerId] = { ...existing, ...myPayload };

            // Prune disconnected players
            if ((nowMs - lastPruneRef.current) > PRUNE_CHECK_RATE_MS) {
                lastPruneRef.current = nowMs;
                const deadIds: string[] = [];

                Object.entries(worldStateRef.current).forEach(([id, p]) => {
                    if (id === peerId) return;
                    if (p.isFading) return;
                    if (p.lastSeen && (nowMs - p.lastSeen > TIMEOUT_MS)) {
                        deadIds.push(id);
                    }
                });

                if (deadIds.length > 0) {
                    deadIds.forEach(id => {
                        if (worldStateRef.current[id]) {
                            worldStateRef.current[id].isFading = true;
                            addAlert(`Player ${ id.substring(0, 4).toUpperCase() } Timed Out`);
                            // Force state update to trigger cleanup
                            setRemotePlayers({ ...worldStateRef.current });

                            setTimeout(() => {
                                const next = { ...worldStateRef.current };
                                delete next[id];
                                worldStateRef.current = next;
                                setRemotePlayers(next); // Clean cleanup
                            }, 500);
                        }
                    });
                }
            }

            // Broadcast
            if (shouldSend) {
                const allIds = Object.keys(worldStateRef.current);
                const heirId = allIds.find(id => id !== peerId) || null;

                // [CONSOLIDATED] Bundle EVERYTHING into one snapshot
                const broadcastPayload = {
                    players: worldStateRef.current,
                    game: bjState,
                    heirId: heirId,
                    timestamp: nowMs
                };

                connectionsRef.current.forEach((conn) => {
                    if (conn.open) {
                        conn.send({ type: 'WORLD_SNAPSHOT', payload: broadcastPayload });
                    }
                });
                lastBroadcastRef.current = nowMs;
            }
        } else if (hostConn && hostConn.open && shouldSend) {
            // Client: Just send my update to Host
            hostConn.send({ type: 'PLAYER_UPDATE', payload: myPayload });
            lastBroadcastRef.current = nowMs;
        }
    });

    return null;
}
