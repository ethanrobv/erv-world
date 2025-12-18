import { useState, useCallback, useRef, useEffect } from 'react';
import * as React from 'react';
import { type DataConnection } from 'peerjs';

// 3D & Effects
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Pixelation } from '@react-three/postprocessing';
import * as THREE from 'three';

// Game Logic & State
import { useNetwork } from '../context/NetworkContext';
import { useGameP2P } from '../hooks/useGameP2P';
import { useThemeColor } from '../hooks/useThemeColor';
import {
    type RemotePlayerState,
    type GameState,
    type SceneType,
    type PortalDef,
    SCENE_DATA,
    FADE_IN_DURATION,
    FADE_OUT_DURATION
} from './game/GameConfig';

// Components
import { BarLevel, AlleyLevel } from './game/GameLevels';
import { Player } from './game/Player';
import { MainMenu, TransitionOverlay, InteractionPrompt, NetworkIndicator, SystemFeed } from './game/GameUI';

/* -------------------------------------------------------------------------- */
/* NETWORK SYNC HELPER                                                        */

/* -------------------------------------------------------------------------- */

/**
 * Handles transmission of local player data to the network.
 * Must be mounted inside <Canvas> to access the render loop via useFrame.
 */
function NetworkSync({
                         playerRef,
                         peerId,
                         isHost,
                         hostConn,
                         connections,
                         gameState,
                         interactionLabel,
                         setRemotePlayers,
                         worldStateRef,
                         currentScene,
                         addAlert
                     }: {
    playerRef: React.RefObject<THREE.Group | null>;
    peerId: string | null;
    isHost: boolean;
    hostConn: any;
    connections: DataConnection[];
    gameState: GameState;
    interactionLabel: string | null;
    setRemotePlayers: React.Dispatch<React.SetStateAction<Record<string, RemotePlayerState>>>;
    worldStateRef: React.RefObject<Record<string, RemotePlayerState>>;
    currentScene: SceneType;
    addAlert: (msg: string) => void;
}) {
    // Throttle control (30Hz broadcast, 1s prune check)
    const lastBroadcast = useRef(0);
    const lastPrune = useRef(0);
    const BROADCAST_RATE = 1 / 30;
    const PRUNE_CHECK_RATE = 1.0;
    const TIMEOUT_MS = 4000;

    const connectionsRef = useRef(connections);
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    useFrame(({ clock }) => {
        if (gameState !== 'playing' || !playerRef.current || !peerId) return;

        const visuals = playerRef.current.children.find(c => c.type === 'Group') || playerRef.current.children[0];
        const now = clock.getElapsedTime();
        const nowMs = Date.now();

        const payload: RemotePlayerState = {
            pos: [playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z],
            rot: visuals ? visuals.rotation.y : 0,
            interaction: interactionLabel,
            scene: currentScene,
            lastSeen: nowMs
        };

        const shouldSend = (now - lastBroadcast.current) > BROADCAST_RATE;

        if (isHost) {
            // 1. Host updates own state in the world map
            const existing = worldStateRef.current[peerId];
            worldStateRef.current[peerId] = { ...existing, ...payload };

            // 2. Prune disconnected/timed-out players
            if ((now - lastPrune.current) > PRUNE_CHECK_RATE) {
                lastPrune.current = now;
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
                            setTimeout(() => {
                                const next = { ...worldStateRef.current };
                                delete next[id];
                                worldStateRef.current = next;
                            }, 1000);
                        }
                    });
                }
            }

            // 3. Broadcast World State to all clients
            if (shouldSend) {
                setRemotePlayers({ ...worldStateRef.current });
                connectionsRef.current.forEach((conn) => {
                    if (conn.open) {
                        conn.send({ type: 'WORLD_STATE', payload: worldStateRef.current });
                    }
                });
                lastBroadcast.current = now;
            }
        } else if (hostConn && hostConn.open && shouldSend) {
            // Guest sends specific player update to Host
            hostConn.send({
                type: 'PLAYER_UPDATE',
                payload
            });
            lastBroadcast.current = now;
        }
    });

    return null;
}

/* -------------------------------------------------------------------------- */
/* MAIN GAME COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

export default function Game() {
    // Context & State
    const { peerId } = useNetwork();
    const [gameState, setGameState] = useState<GameState>('menu');
    const [currentScene, setCurrentScene] = useState<SceneType>('bar');

    // Gameplay State
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isInputLocked, setIsInputLocked] = useState(false);
    const [playerSpawn, setPlayerSpawn] = useState<{ pos: [number, number, number], rot: number }>({
        pos: [0, 0, 0],
        rot: 0
    });
    const [interactionLabel, setInteractionLabel] = useState<string | null>(null);
    const [systemMessages, setSystemMessages] = useState<Array<{ id: number, text: string }>>([]);

    const playerRef = useRef<THREE.Group>(null);

    /* -------------------------------------------------------------------------- */
    /* UI & SCENE LOGIC                                                           */
    /* -------------------------------------------------------------------------- */

    const addAlert = useCallback((text: string) => {
        const id = Date.now();
        setSystemMessages(prev => [...prev, { id, text }]);
        setTimeout(() => setSystemMessages(prev => prev.filter(m => m.id !== id)), 5000);
    }, []);

    const handlePortalEnter = useCallback((portal: PortalDef) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setIsInputLocked(true);
        setInteractionLabel(null);

        // Scene transition sequence
        setTimeout(() => {
            setCurrentScene(portal.targetScene);
            setPlayerSpawn({ pos: portal.spawnPosition, rot: portal.spawnRotation });
            setTimeout(() => setIsTransitioning(false), 100);
            setTimeout(() => setIsInputLocked(false), FADE_IN_DURATION);
        }, FADE_OUT_DURATION);
    }, [isTransitioning]);

    const barriers = SCENE_DATA[currentScene].barriers;
    const portals = SCENE_DATA[currentScene].portals;
    const interactables = SCENE_DATA[currentScene].interactables || [];
    const isDoorOpen = isTransitioning;

    /* -------------------------------------------------------------------------- */
    /* NETWORKING LOGIC                                                           */
    /* -------------------------------------------------------------------------- */

    const worldStateRef = useRef<Record<string, RemotePlayerState>>({});
    const [remotePlayers, setRemotePlayers] = useState<Record<string, RemotePlayerState>>({});
    const initializedConnections = useRef<WeakSet<DataConnection>>(new WeakSet());

    const onPeerJoined = useCallback((id: string) => {
        addAlert(`Player ${ id.substring(0, 4).toUpperCase() } joined`);
        if (worldStateRef.current[id]) {
            const revived = { ...worldStateRef.current[id], isFading: false, lastSeen: Date.now() };
            worldStateRef.current[id] = revived;
            setRemotePlayers(prev => ({ ...prev, [id]: revived }));
        }
    }, [addAlert]);

    const onPeerLeft = useCallback((id: string) => {
        if (worldStateRef.current[id]) {
            worldStateRef.current[id].isFading = true;
            addAlert(`Player ${ id.substring(0, 4).toUpperCase() } left`);
            setTimeout(() => {
                if (worldStateRef.current[id]) {
                    const next = { ...worldStateRef.current };
                    delete next[id];
                    worldStateRef.current = next;
                    setRemotePlayers({ ...next });
                }
            }, 1000);
        }
    }, [addAlert]);

    const getPeerList = useCallback(() => {
        const ids = new Set(Object.keys(worldStateRef.current));
        if (peerId) ids.add(peerId);
        return Array.from(ids);
    }, [peerId]);

    const {
        isHost,
        roomCode,
        connections,
        hostConn,
        startHosting,
        joinRoom
    } = useGameP2P(onPeerJoined, onPeerLeft, getPeerList);

    // Host Data Handler
    useEffect(() => {
        if (!isHost) return;
        connections.forEach((conn) => {
            if (initializedConnections.current.has(conn)) return;
            initializedConnections.current.add(conn);
            conn.on('data', (data: any) => {
                if (data.type === 'PLAYER_UPDATE') {
                    const existing = worldStateRef.current[conn.peer];
                    worldStateRef.current[conn.peer] = { ...existing, ...data.payload };
                }
            });
        });
    }, [isHost, connections]);

    // Guest Data Handler
    useEffect(() => {
        if (isHost || !hostConn) return;
        const handleHostData = (data: any) => {
            if (data.type === 'WORLD_STATE') {
                setRemotePlayers(data.payload);
                worldStateRef.current = data.payload;
            }
        };
        hostConn.on('data', handleHostData);
        return () => {
            hostConn.off('data', handleHostData);
        };
    }, [hostConn, isHost]);

    // Detect Player Disconnects via Fading State
    const prevFadingRef = useRef<Set<string>>(new Set());
    useEffect(() => {
        if (isHost) return;
        Object.entries(remotePlayers).forEach(([id, p]) => {
            if (p.isFading && !prevFadingRef.current.has(id)) {
                addAlert(`Player ${ id.substring(0, 4).toUpperCase() } Left`);
                prevFadingRef.current.add(id);
            }
        });
    }, [remotePlayers, isHost, addAlert]);

    const handleHost = async () => {
        await startHosting();
        setGameState('playing');
    };

    const handleJoin = async (id: string) => {
        try {
            await joinRoom(id);
            setGameState('playing');
        } catch (e) {
            alert('Failed to join: ' + e);
        }
    };

    /* -------------------------------------------------------------------------- */
    /* RENDER                                                                     */
    /* -------------------------------------------------------------------------- */

    return (
        <div style={ { width: '100%', height: '100%', position: 'relative', overflow: 'hidden' } }>
            {/* UI Overlays */ }
            <TransitionOverlay isActive={ isTransitioning }/>
            <NetworkIndicator roomCode={ roomCode } isHost={ isHost }/>
            <InteractionPrompt label={ interactionLabel }/>
            <SystemFeed messages={ systemMessages }/>

            { gameState === 'menu' && (
                <MainMenu
                    onHost={ handleHost }
                    onJoin={ handleJoin }
                />
            ) }

            {/* 3D Scene */ }
            <Canvas shadows dpr={ [1, 2] }>
                <color attach='background' args={ [useThemeColor('--bg-page')] }/>

                {/* Camera & Lighting */ }
                <PerspectiveCamera makeDefault position={ [0, 12, 16] } fov={ 40 } near={ 0.1 } far={ 200 }
                                   onUpdate={ (c) => c.lookAt(0, 0, 0) }/>
                <ambientLight intensity={ 0.4 }/>
                <hemisphereLight intensity={ 0.3 } groundColor='#444'/>
                <directionalLight position={ [10, 20, 10] } intensity={ 1.2 } castShadow shadow-mapSize={ [1024, 1024] }
                                  shadow-bias={ -0.0001 }>
                    <orthographicCamera attach='shadow-camera' args={ [-20, 20, 20, -20] }/>
                </directionalLight>
                <pointLight position={ [-10, 5, -5] } intensity={ 0.5 } color='#ccccff'/>

                {/* Logic Helpers */ }
                <NetworkSync
                    playerRef={ playerRef }
                    peerId={ peerId }
                    isHost={ isHost }
                    hostConn={ hostConn }
                    connections={ connections }
                    gameState={ gameState }
                    interactionLabel={ interactionLabel }
                    setRemotePlayers={ setRemotePlayers }
                    worldStateRef={ worldStateRef }
                    currentScene={ currentScene }
                    addAlert={ addAlert }
                />

                {/* Level Architecture */ }
                { currentScene === 'bar' ?
                    <BarLevel isDoorOpen={ isDoorOpen } playerRef={ playerRef }/> :
                    <AlleyLevel isDoorOpen={ isDoorOpen }/> }

                {/* Local Player */ }
                <Player
                    key={ currentScene }
                    playerRef={ playerRef }
                    isPlaying={ gameState === 'playing' }
                    inputLocked={ isInputLocked }
                    initialPos={ playerSpawn.pos }
                    initialRot={ playerSpawn.rot }
                    barriers={ barriers }
                    portals={ portals }
                    interactables={ interactables }
                    onPortalEnter={ handlePortalEnter }
                    onInteractChange={ setInteractionLabel }
                    peerId={ peerId || 'Local' }
                />

                {/* Remote Players */ }
                { Object.entries(remotePlayers).map(([id, data]) => {
                    if (id === peerId) return null;
                    if (data.scene !== currentScene) return null;

                    return (
                        <Player
                            key={ id }
                            peerId={ id }
                            isRemote={ true }
                            isPlaying={ true }
                            remoteData={ data }
                            initialPos={ data.pos }
                            initialRot={ data.rot }
                            barriers={ [] }
                            portals={ [] }
                            onPortalEnter={ () => {
                            } }
                        />
                    );
                }) }

                {/* Post Processing */ }
                <EffectComposer enableNormalPass={ false }>
                    <Pixelation granularity={ 1 }/>
                    <Bloom luminanceThreshold={ 1 } mipmapBlur intensity={ 1.2 } radius={ 0.5 }/>
                </EffectComposer>
            </Canvas>
        </div>
    );
}
