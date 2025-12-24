import React, { useRef, useEffect } from 'react';
import type { DataConnection } from 'peerjs';
import { useFrame } from '@react-three/fiber';
import { useWorkerInterval } from '../../hooks/useWorkerInterval';
import type { GameState, PlayerPose, SceneType, ActivityState, RemotePlayerState } from './GameConfig';
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

    const BROADCAST_RATE_MS = 33; // ~30 FPS
    const TIMEOUT_MS = 4000;

    const connectionsRef = useRef(connections);
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    // --- HOST: Optimize Game State Broadcasting ---
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

    // --- HOST: Heartbeats ---
    useWorkerInterval(() => {
        if (!isHost) return;
        const now = Date.now();
        if (now - lastBroadcastRef.current > 500) {
            connectionsRef.current.forEach((conn) => {
                if (conn.open) conn.send({ type: 'HEARTBEAT' });
            });
        }
    }, isHost ? 500 : null);

    // --- CLIENT: Ping Host ---
    useWorkerInterval(() => {
        if (isHost || !hostConn || !hostConn.open) return;
        hostConn.send({ type: 'PING', timestamp: Date.now() });
    }, 1000);

    // --- HOST PROMOTION & INITIAL SYNC ---
    useEffect(() => {
        if (isHost) {
            // 1. Immediate Cleanup: Remove the old host/stale players to prevent ghosts
            const now = Date.now();
            if (worldStateRef.current) {
                const nextState = { ...worldStateRef.current };
                let didPrune = false;

                Object.entries(nextState).forEach(([id, p]) => {
                    // If a player hasn't been seen in >4s, they are likely the crashed host
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
            }

            // 2. Send World Snapshot to existing connections
            const allIds = Object.keys(worldStateRef.current || {}).sort();
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
    }, [isHost]); // Only runs once on promotion

    // --- PING/PONG HANDLER ---
    useEffect(() => {
        if (isHost || !hostConn || !setPing) return;
        const handler = (data: any) => {
            if (data.type === 'PONG') setPing(Date.now() - data.timestamp);
        };
        hostConn.on('data', handler);
        return () => {
            hostConn.off('data', handler);
        };
    }, [isHost, hostConn, setPing]);

    // --- MAIN FRAME LOOP ---
    useFrame(() => {
        if (gameState !== 'playing' || !playerRef.current || !peerId) return;

        const nowMs = Date.now();
        const shouldSend = (nowMs - lastBroadcastRef.current) > BROADCAST_RATE_MS;

        // Construct the payload with specific Activity data and generic Metadata
        const myPayload: RemotePlayerState = {
            pos: [
                playerRef.current.position.x,
                playerRef.current.position.y,
                playerRef.current.position.z
            ] as [number, number, number],
            rot: visualsRef.current?.rotation.y || 0,
            pose: playerPose,
            interaction: interactionRef.current?.label || null,
            scene: currentScene,
            lastSeen: nowMs,
            name: playerName,
            activity: syncData?.activity,
            meta: syncData
        };

        if (isHost && worldStateRef.current) {
            // -- HOST LOGIC --
            worldStateRef.current[peerId] = { ...worldStateRef.current[peerId], ...myPayload };

            // Pruning Logic (Every 500ms)
            if ((nowMs - lastPruneRef.current) > 500) {
                lastPruneRef.current = nowMs;
                const deadIds: string[] = [];
                Object.entries(worldStateRef.current).forEach(([id, p]) => {
                    if (id === peerId) return;
                    if (p.isFading) return; // Already handling fade out
                    if (p.lastSeen && (nowMs - p.lastSeen > TIMEOUT_MS)) deadIds.push(id);
                });

                if (deadIds.length > 0) {
                    deadIds.forEach(id => {
                        if (worldStateRef.current[id]) {
                            worldStateRef.current[id].isFading = true;
                            const msg = `Player ${ id.substring(0, 4).toUpperCase() } disconnected`;
                            addAlert(msg);
                            connectionsRef.current.forEach(conn => {
                                if (conn.open) conn.send({ type: 'SYSTEM_MESSAGE', payload: msg });
                            });

                            setRemotePlayers({ ...worldStateRef.current });

                            // Remove completely after fade
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
                // Calculate Heir ID Dynamically
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
