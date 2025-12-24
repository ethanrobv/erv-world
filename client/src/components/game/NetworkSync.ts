import React, { useRef, useEffect } from 'react';
import type { DataConnection } from 'peerjs';
import { useFrame } from '@react-three/fiber';
import { useWorkerInterval } from '../../hooks/useWorkerInterval';
import type {
    GameState,
    PlayerPose,
    SceneType,
    ActivityState,
    RemotePlayerState,
    NetworkMessage // Added import
} from './GameConfig';
import * as THREE from 'three';

interface NetworkSyncProps {
    playerRef: React.RefObject<THREE.Group | null>;
    visualsRef: React.RefObject<THREE.Group | null>;
    peerId: string | null;
    isHost: boolean;
    hostConn: DataConnection | null;
    connections: DataConnection[];
    gameState: GameState;
    interactionRef: React.RefObject<{ label: string | null }>;
    playerPose: PlayerPose;
    setRemotePlayers: React.Dispatch<React.SetStateAction<Record<string, RemotePlayerState>>>;
    worldStateRef: React.RefObject<Record<string, RemotePlayerState>>;
    currentScene: SceneType;
    addAlert: (msg: string) => void;
    activityState: ActivityState;
    setPing?: (ping: number) => void;
    playerName: string;
    syncData?: Record<string, unknown>;
}

export function NetworkSync({
                                playerRef,
                                visualsRef,
                                peerId,
                                isHost,
                                hostConn,
                                connections,
                                gameState,
                                interactionRef,
                                playerPose,
                                setRemotePlayers,
                                worldStateRef,
                                currentScene,
                                addAlert,
                                activityState,
                                setPing,
                                playerName,
                                syncData = {},
                            }: NetworkSyncProps) {
    const lastBroadcastRef = useRef(0);
    const lastPruneRef = useRef(0);

    // Config: 30 FPS updates, 4s Timeout
    const BROADCAST_RATE_MS = 33;
    const TIMEOUT_MS = 4000;

    const connectionsRef = useRef(connections);
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    // --- HOST: Activity State Broadcasting ---
    useEffect(() => {
        if (!isHost) return;

        const payload = {
            type: 'ACTIVITY_UPDATE',
            payload: {
                state: activityState,
                timestamp: Date.now()
            }
        };

        connectionsRef.current.forEach(conn => {
            if (conn.open) conn.send(payload);
        });
    }, [isHost, activityState]);

    // --- HOST: Keep-Alive Heartbeats ---
    useWorkerInterval(() => {
        if (!isHost) return;
        const now = Date.now();
        if (now - lastBroadcastRef.current > 500) {
            connectionsRef.current.forEach((conn) => {
                if (conn.open) conn.send({ type: 'HEARTBEAT' });
            });
        }
    }, isHost ? 500 : null);

    // --- CLIENT: Latency Ping ---
    useWorkerInterval(() => {
        if (isHost || !hostConn || !hostConn.open) return;
        hostConn.send({ type: 'PING', timestamp: Date.now() });
    }, 1000);

    // --- HOST PROMOTION & INITIAL SYNC ---
    useEffect(() => {
        if (isHost && worldStateRef.current) {
            // 1. Cleanup stale players (e.g., previous crashed host)
            const now = Date.now();
            const nextState = { ...worldStateRef.current };
            let didPrune = false;

            Object.entries(nextState).forEach(([id, p]) => {
                if (id !== peerId && (!p.lastSeen || now - p.lastSeen > TIMEOUT_MS)) {
                    delete nextState[id];
                    didPrune = true;
                }
            });

            if (didPrune) {
                worldStateRef.current = nextState;
                setRemotePlayers(nextState);
                const msg = 'Host migrated';
                addAlert(msg);

                connections.forEach(conn => {
                    if (conn.open) conn.send({ type: 'SYSTEM_MESSAGE', payload: msg });
                });
            }

            // 2. Broadcast World Snapshot
            const allIds = Object.keys(worldStateRef.current).sort();
            const nextHeir = allIds.find(id => id !== peerId) || null;

            const initialSnapshot = {
                players: worldStateRef.current,
                game: activityState,
                heirId: nextHeir,
                timestamp: Date.now()
            };

            connections.forEach(conn => {
                if (conn.open) {
                    conn.send({ type: 'WORLD_SNAPSHOT', payload: initialSnapshot });
                }
            });
        }
    }, [isHost, connections, peerId, activityState, addAlert, setRemotePlayers, worldStateRef]);

    // --- PING/PONG HANDLER ---
    useEffect(() => {
        if (isHost || !hostConn || !setPing) return;

        // Use 'unknown' type to satisfy ESLint, then narrow via type guard or casting
        const handler = (data: unknown) => {
            // Safe cast assuming the data follows our NetworkMessage structure
            const msg = data as NetworkMessage;
            if (msg.type === 'PONG') {
                setPing(Date.now() - msg.timestamp);
            }
        };

        hostConn.on('data', handler);
        return () => {
            hostConn.off('data', handler);
        };
    }, [isHost, hostConn, setPing]);

    // --- MAIN GAME LOOP (UseFrame) ---
    useFrame(() => {
        if (gameState !== 'playing' || !playerRef.current || !peerId || !worldStateRef.current) return;

        const nowMs = Date.now();
        const shouldSend = (nowMs - lastBroadcastRef.current) > BROADCAST_RATE_MS;

        const myPayload: RemotePlayerState = {
            pos: [
                playerRef.current.position.x,
                playerRef.current.position.y,
                playerRef.current.position.z
            ],
            rot: visualsRef.current?.rotation.y || 0,
            pose: playerPose,
            interaction: interactionRef.current?.label || null,
            scene: currentScene,
            lastSeen: nowMs,
            name: playerName,
            activity: syncData?.activity as { type: ActivityState['fishing']['type']; phase: string } | undefined,
            meta: syncData
        };

        if (isHost) {
            // -- HOST LOGIC --
            // Update self in world state
            worldStateRef.current[peerId] = { ...worldStateRef.current[peerId], ...myPayload };

            // Pruning Logic (Run every 500ms to save CPU)
            if ((nowMs - lastPruneRef.current) > 500) {
                lastPruneRef.current = nowMs;
                const deadIds: string[] = [];

                Object.entries(worldStateRef.current).forEach(([id, p]) => {
                    if (id === peerId) return;
                    if (p.isFading) return;
                    if (p.lastSeen && (nowMs - p.lastSeen > TIMEOUT_MS)) deadIds.push(id);
                });

                if (deadIds.length > 0) {
                    deadIds.forEach(id => {
                        if (worldStateRef.current?.[id]) {
                            // Mark as fading first
                            worldStateRef.current[id].isFading = true;
                            const msg = `Player ${ id.substring(0, 4).toUpperCase() } disconnected`;
                            addAlert(msg);

                            connectionsRef.current.forEach(conn => {
                                if (conn.open) conn.send({ type: 'SYSTEM_MESSAGE', payload: msg });
                            });

                            // Trigger React update for visual fade
                            setRemotePlayers({ ...worldStateRef.current });

                            // Hard delete after fade animation
                            setTimeout(() => {
                                if (worldStateRef.current) {
                                    const next = { ...worldStateRef.current };
                                    delete next[id];
                                    worldStateRef.current = next;
                                    setRemotePlayers(next);
                                }
                            }, 500);
                        }
                    });
                }
            }

            if (shouldSend) {
                // Calculate Heir (next longest-connected player)
                const allIds = Object.keys(worldStateRef.current).sort();
                const nextHeir = allIds.find(id => id !== peerId) || null;

                const broadcastPayload = {
                    players: worldStateRef.current,
                    heirId: nextHeir,
                    timestamp: nowMs
                };

                connectionsRef.current.forEach((conn) => {
                    if (conn.open) {
                        conn.send({ type: 'PLAYER_SNAPSHOT', payload: broadcastPayload });
                    }
                });
                lastBroadcastRef.current = nowMs;
            }
        } else if (hostConn && hostConn.open && shouldSend) {
            // -- CLIENT LOGIC --
            hostConn.send({ type: 'PLAYER_UPDATE', payload: myPayload });
            lastBroadcastRef.current = nowMs;
        }
    });

    return null;
}
