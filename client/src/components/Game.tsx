import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { DataConnection } from 'peerjs';

// 3D & Effects
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera, Preload, useProgress } from '@react-three/drei';
import { Bloom, EffectComposer, Pixelation } from '@react-three/postprocessing';
import * as THREE from 'three';

// Game Context & Hooks
import { useNetwork } from '../context/NetworkContext';
import { useGameP2P } from '../hooks/useGameP2P';
import { useThemeColor } from '../hooks/useThemeColor';
import { useActivity } from '../hooks/useActivity';

// Config & Types
import {
    FADE_IN_DURATION,
    FADE_OUT_DURATION,
    type GameState,
    type PlayerPose,
    type PortalDef,
    type RemotePlayerState,
    type SceneType
} from './game/GameConfig';

import { LEVELS } from './game/LevelData';

// Components
import { AlleyLevel, BarLevel } from './game/GameLevels';
import { Player } from './game/Player';
import { NetworkSync } from './game/NetworkSync';
import {
    BlackjackHUD,
    InteractionPrompt,
    MainMenu,
    NetworkIndicator,
    EscOverlayMenu,
    SystemFeed,
    TransitionOverlay,
    FishingHUD
} from './game/ui';

export default function Game() {
    const { peerId } = useNetwork();
    const [, startTransition] = useTransition();

    // --- ASSET LOADING STATE ---
    const { active, progress, total } = useProgress();
    const [assetsLoaded, setAssetsLoaded] = useState(false);

    useEffect(() => {
        if (progress === 100 || (total === 0 && !active)) {
            setAssetsLoaded(true);
        }
    }, [progress, total, active]);

    const isReady = peerId !== null && assetsLoaded;

    // Global State
    const [gameState, setGameState] = useState<GameState>('menu');
    const [currentScene, setCurrentScene] = useState<SceneType>('bar');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isInputLocked, setIsInputLocked] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Player State
    const [playerSpawn, setPlayerSpawn] = useState<{ pos: [number, number, number]; rot: number }>({
        pos: [0, 0, 0],
        rot: Math.PI
    });
    const [playerPose, setPlayerPose] = useState<PlayerPose>('idle');
    const [playerName, setPlayerName] = useState('');
    const [money, setMoney] = useState(100);

    // Refs
    const promptRef = useRef<HTMLDivElement>(null);
    const interactionStateRef = useRef<{ label: string | null }>({ label: null });
    const playerRef = useRef<THREE.Group>(null);
    const visualsRef = useRef<THREE.Group>(null);
    const worldStateRef = useRef<Record<string, RemotePlayerState>>({});
    const initializedConnections = useRef<WeakSet<DataConnection>>(new WeakSet());

    // Alerts
    const [systemMessages, setSystemMessages] = useState<Array<{ id: number; text: string }>>([]);
    const alertIdRef = useRef(0);
    const addAlert = useCallback((text: string) => {
        const id = alertIdRef.current++;
        setSystemMessages(prev => [...prev, { id, text }]);
        setTimeout(() => setSystemMessages(prev => prev.filter(m => m.id !== id)), 3000);
    }, []);

    // Network & P2P Setup
    const [remotePlayers, setRemotePlayers] = useState<Record<string, RemotePlayerState>>({});
    const [heirId, setHeirId] = useState<string | null>(null);
    const [ping, setPing] = useState<number>(0);

    // Environment
    const [isFireLit, setIsFireLit] = useState(true);
    const sunColor = useThemeColor('--game-sun-color') || '#fff7ed';
    const isNight = sunColor === '#000000' || sunColor === 'rgb(0, 0, 0)';
    const isDay = !isNight;
    const isRaining = !isDay;

    const onPeerJoined = useCallback((id: string) => {
        addAlert(`Player ${ id.substring(0, 4).toUpperCase() } joined`);
    }, [addAlert]);

    const onPeerLeft = useCallback((id: string) => {
        if (worldStateRef.current[id]) {
            worldStateRef.current[id].isFading = true;
            addAlert(`Player ${ id.substring(0, 4).toUpperCase() } left`);
            setRemotePlayers({ ...worldStateRef.current });
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

    const {
        isHost,
        roomCode,
        connections,
        hostConn,
        startHosting,
        joinRoom
    } = useGameP2P(onPeerJoined, onPeerLeft, heirId);

    // --- Activity Management Hook ---
    const {
        activityState,
        dispatch: dispatchActivity,
        processAction,
        handleRemoteUpdate
    } = useActivity({ isHost, peerId, hostConn, connections, setMoney, money, addAlert });

    const bjSeatIndex = isReady && peerId
        ? activityState.blackjack.seats.findIndex(s => s.peerId === peerId)
        : -1;

    const fishingSeat = isReady && peerId
        ? activityState.fishing.seats.find(s => s.peerId === peerId)
        : null;

    const isOccupied = bjSeatIndex !== -1 || !!fishingSeat;

    // --- Inputs & UI visibility ---
    useEffect(() => {
        if (isOccupied && promptRef.current) promptRef.current.style.opacity = '0';
    }, [isOccupied]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Escape' && gameState === 'playing') setIsPaused(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    // --- Network Handlers ---
    const networkHandlers = useMemo(() => ({
        'PLAYER_UPDATE': (data: any, conn: DataConnection) => {
            const existing = worldStateRef.current[conn.peer];
            const newData = { ...existing, ...data.payload };
            worldStateRef.current[conn.peer] = newData;
            setRemotePlayers(prev => {
                if (!prev[conn.peer] || prev[conn.peer].scene !== newData.scene) {
                    return { ...prev, [conn.peer]: newData };
                }
                return prev;
            });
        },
        'PLAYER_SNAPSHOT': (data: any) => {
            const { players, heirId } = data.payload;
            worldStateRef.current = players;
            setRemotePlayers(() => players);
            if (heirId) setHeirId(heirId);
        },
        'ACTIVITY_UPDATE': (data: any) => {
            handleRemoteUpdate(data.payload.state);
        },
        'WORLD_SNAPSHOT': (data: any) => {
            const { players, game, heirId } = data.payload;
            worldStateRef.current = players;
            setRemotePlayers(players);
            handleRemoteUpdate(game);
            setHeirId(heirId);
        },
        'ACTIVITY_ACTION': (data: any, conn: DataConnection) => {
            const { action, seatIndex, amount, ...extra } = data.payload;
            // Bundle params correctly for composite handler
            processAction(action, { seatIndex, amount, ...extra, playerId: conn.peer });
        },
        'HEARTBEAT': (_: any, conn: DataConnection) => {
            const existing = worldStateRef.current[conn.peer];
            if (existing) worldStateRef.current[conn.peer] = { ...existing, lastSeen: Date.now() };
        },
        'PING': (data: any, conn: DataConnection) => {
            conn.send({ type: 'PONG', timestamp: data.timestamp });
            const existing = worldStateRef.current[conn.peer];
            if (existing) worldStateRef.current[conn.peer] = { ...existing, lastSeen: Date.now() };
        },
        'PONG': (data: any) => setPing(Date.now() - data.timestamp),
        'GAME_EVENT': (data: any) => {
            if (data.payload.id === 'trash-fire') startTransition(() => setIsFireLit(data.payload.value));
        },
        'SYSTEM_MESSAGE': (data: any) => addAlert(data.payload)
    }), [addAlert, handleRemoteUpdate, processAction]);

    // FIX: Use a Ref for handlers so the event listener closure always sees the latest state
    const handlersRef = useRef(networkHandlers);
    handlersRef.current = networkHandlers;

    useEffect(() => {
        if (isHost) {
            connections.forEach((conn) => {
                if (initializedConnections.current.has(conn)) return;
                initializedConnections.current.add(conn);

                // Listener uses the REF, avoiding Stale Closures
                conn.on('data', (data: any) => {
                    const handler = handlersRef.current[data.type as keyof typeof networkHandlers];
                    if (handler) handler(data, conn);
                });
            });
        }
        if (!isHost && hostConn) {
            const handleHostData = (data: any) => {
                // Client side re-binds on render, but using ref is safer here too
                const handler = handlersRef.current[data.type as keyof typeof networkHandlers];
                if (handler) handler(data, hostConn);
            };
            hostConn.on('data', handleHostData);
            return () => {
                hostConn.off('data', handleHostData);
            };
        }
    }, [isHost, connections, hostConn]); // Removed networkHandlers from dep array to avoid churn

    // --- Interaction Logic ---
    const handlePortalEnter = useCallback((portal: PortalDef) => {
        if (isTransitioning) return;
        startTransition(() => {
            setIsTransitioning(true);
            setIsInputLocked(true);
        });
        setTimeout(() => {
            startTransition(() => {
                setCurrentScene(portal.targetScene);
                setPlayerSpawn({ pos: portal.spawnPosition, rot: portal.spawnRotation });
            });
            setTimeout(() => {
                setIsTransitioning(false);
                setIsInputLocked(false);
            }, FADE_IN_DURATION);
        }, FADE_OUT_DURATION);
    }, [isTransitioning]);

    const handleSeatInteract = (seatIndex: number) => {
        dispatchActivity('SIT', { seatIndex, targetActivity: 'blackjack' });
    };

    const handleTriggerInteract = useCallback((id: string) => {
        if (id === 'trash-fire') {
            const newVal = !isFireLit;
            startTransition(() => setIsFireLit(newVal));
            const msg = { type: 'GAME_EVENT', payload: { id: 'trash-fire', value: newVal } };
            if (isHost) connections.forEach(c => c.send(msg));
            else hostConn?.send(msg);
        } else if (id === 'start-fishing') {
            dispatchActivity('JOIN_FISHING', {
                targetActivity: 'fishing',
                env: { isDay, isRaining }
            });
        }
    }, [isHost, connections, hostConn, isFireLit, dispatchActivity, isDay, isRaining]);

    // Action Router for UI inputs
    const handleAction = (action: string, payload: any = {}) => {
        if (bjSeatIndex !== -1) {
            dispatchActivity(action, { ...payload, seatIndex: bjSeatIndex, targetActivity: 'blackjack' });
        } else if (fishingSeat) {
            dispatchActivity(action, { ...payload, seatIndex: -1, targetActivity: 'fishing' });
        }
    };

    const handleLeave = () => handleAction('LEAVE');

    const handleLeaveBlackjack = () => {
        if (bjSeatIndex !== -1 && (activityState.blackjack.phase === 'playing' || activityState.blackjack.phase === 'dealing')) {
            addAlert(`You left an active hand. -$${ activityState.blackjack.seats[bjSeatIndex].bet }`);
        }
        handleLeave();
    };

    const currentInteractable = LEVELS[currentScene].interactables?.find(
        (i) => i.behavior?.type === 'seat' && i.behavior.seatIndex === bjSeatIndex
    );

    const mySyncData = useMemo(() => {
        let act = null;
        if (bjSeatIndex !== -1) {
            act = { type: 'blackjack', phase: activityState.blackjack.phase };
        } else if (fishingSeat) {
            act = { type: 'fishing', phase: fishingSeat.phase };
        }

        return { money, isPaused, activity: act };
    }, [money, isPaused, bjSeatIndex, fishingSeat, activityState.blackjack.phase]);


    return (
        <div style={ { width: '100%', height: '100%', position: 'relative', overflow: 'hidden' } }>
            <div className='absolute inset-0 z-0'>
                <Canvas shadows dpr={ [1, 2] }
                        gl={ { toneMapping: THREE.ReinhardToneMapping, toneMappingExposure: 1.2 } }>
                    <Preload all/>
                    <color attach='background' args={ [useThemeColor('--bg-page')] }/>
                    <PerspectiveCamera makeDefault position={ [0, 12, 16] } fov={ 40 }
                                       onUpdate={ c => c.lookAt(0, 0, 0) }/>
                    <ambientLight intensity={ 0.15 }/>
                    <hemisphereLight intensity={ 0.1 } groundColor='#000000'/>

                    { currentScene === 'bar'
                        ? <BarLevel isDoorOpen={ isTransitioning }
                                    dealerHand={ activityState.blackjack.dealerHand }/>
                        : <AlleyLevel isDoorOpen={ isTransitioning } isFireLit={ isFireLit }/>
                    }

                    { isReady && (
                        <>
                            <NetworkSync
                                playerRef={ playerRef }
                                visualsRef={ visualsRef }
                                peerId={ peerId }
                                isHost={ isHost }
                                hostConn={ hostConn }
                                connections={ connections }
                                gameState={ gameState }
                                interactionRef={ interactionStateRef }
                                playerPose={ playerPose }
                                setRemotePlayers={ setRemotePlayers }
                                worldStateRef={ worldStateRef }
                                currentScene={ currentScene }
                                addAlert={ addAlert }
                                activityState={ activityState }
                                setPing={ setPing }
                                playerName={ playerName }
                                syncData={ mySyncData }
                            />

                            <Player
                                key={ currentScene }
                                playerRef={ playerRef }
                                visualsRef={ visualsRef }
                                promptRef={ promptRef }
                                interactionStateRef={ interactionStateRef }
                                isPlaying={ gameState === 'playing' }
                                inputLocked={ isInputLocked || isOccupied }
                                initialPos={ playerSpawn.pos }
                                initialRot={ playerSpawn.rot }
                                barriers={ LEVELS[currentScene].barriers }
                                portals={ LEVELS[currentScene].portals }
                                interactables={ LEVELS[currentScene].interactables || [] }
                                waterZones={ LEVELS[currentScene].waterZones || [] }
                                onPortalEnter={ handlePortalEnter }
                                onInteractChange={ () => {
                                } }
                                onPoseChange={ setPlayerPose }
                                onSeatInteract={ handleSeatInteract }
                                onTriggerInteract={ handleTriggerInteract }
                                peerId={ peerId || 'Local' }
                                seatData={
                                    bjSeatIndex !== -1 ? {
                                        seatIndex: bjSeatIndex,
                                        hand: activityState.blackjack.seats[bjSeatIndex].hand,
                                        activityType: 'blackjack'
                                    } : fishingSeat ? {
                                        seatIndex: -1,
                                        hand: [],
                                        activityType: 'fishing',
                                        phase: fishingSeat.phase,
                                        biteStrength: fishingSeat.biteStrength
                                    } : null
                                }
                                name={ playerName }
                            />
                            { Object.entries(remotePlayers).map(([id, data]) => {
                                if (id === peerId) return null;
                                if (data.scene !== currentScene) return null;

                                let seatData = null;
                                const remoteBJIndex = activityState.blackjack.seats.findIndex(s => s.peerId === id);
                                const remoteFishSeat = activityState.fishing.seats.find(s => s.peerId === id);

                                if (remoteBJIndex !== -1) {
                                    seatData = {
                                        seatIndex: remoteBJIndex,
                                        hand: activityState.blackjack.seats[remoteBJIndex].hand,
                                        activityType: 'blackjack'
                                    };
                                } else if (remoteFishSeat) {
                                    seatData = {
                                        seatIndex: -1,
                                        hand: [],
                                        activityType: 'fishing',
                                        phase: remoteFishSeat.phase
                                    };
                                }

                                return (
                                    <Player
                                        key={ id }
                                        peerId={ id }
                                        isRemote={ true }
                                        isPlaying={ true }
                                        remoteData={ data }
                                        worldStateRef={ worldStateRef }
                                        initialPos={ data.pos }
                                        initialRot={ data.rot }
                                        barriers={ [] }
                                        portals={ [] }
                                        onPortalEnter={ () => {
                                        } }
                                        seatData={ seatData }
                                    />
                                );
                            }) }
                        </>
                    ) }
                    <EffectComposer enableNormalPass={ false }>
                        <Pixelation granularity={ 4 }/>
                        <Bloom luminanceThreshold={ 1 } intensity={ 1.2 } radius={ 0.5 }/>
                    </EffectComposer>
                </Canvas>
            </div>

            <div className='absolute inset-0 z-10 pointer-events-none'>
                { !isReady && (
                    <div
                        className='absolute inset-0 z-50 flex flex-col items-center justify-center bg-page text-text-main pointer-events-auto'>
                        <div className='text-xl font-bold'>
                            { !peerId ? 'Connecting...' : `Loading Assets ${ Math.round(progress) }%` }
                        </div>
                        <div className='mt-2 text-sm text-text-muted animate-pulse'>preloading shaders & initializing
                            connection
                        </div>
                    </div>
                ) }

                <TransitionOverlay isActive={ isTransitioning }/>
                <NetworkIndicator roomCode={ roomCode } isHost={ isHost } ping={ ping }/>
                { !isOccupied && isReady && <InteractionPrompt ref={ promptRef }/> }
                { isPaused && <div className='pointer-events-auto'><EscOverlayMenu onResume={ () => setIsPaused(false) }
                                                                                   onMainMenu={ () => window.location.reload() }/>
                </div> }

                { bjSeatIndex !== -1 && (
                    <div className='absolute inset-0 pointer-events-none'>
                        <BlackjackHUD
                            seat={ activityState.blackjack.seats[bjSeatIndex] }
                            dealerHand={ activityState.blackjack.dealerHand }
                            isMyTurn={ activityState.blackjack.activeSeatIndex === bjSeatIndex }
                            onBet={ (amt) => handleAction('BET', { amount: amt }) }
                            onAction={ (act) => handleAction(act.toUpperCase()) }
                            onLeave={ handleLeaveBlackjack }
                            seatLabel={ currentInteractable?.label }
                            money={ money }
                            exitLabel={ (currentInteractable?.behavior as any)?.exitLabel || 'Stand Up' }
                            gamePhase={ activityState.blackjack.phase }
                        />
                    </div>
                ) }

                { fishingSeat && (
                    <div className='absolute inset-0 pointer-events-none'>
                        <FishingHUD
                            gameState={ activityState.fishing }
                            mySeat={ fishingSeat }
                            onAction={ handleAction }
                            onLeave={ handleLeave }
                            isDay={ isDay }
                            isRaining={ isRaining }
                        />
                    </div>
                ) }

                { gameState === 'menu' && isReady && (
                    <div className='pointer-events-auto'>
                        <MainMenu onHost={ async () => {
                            await startHosting();
                            setGameState('playing');
                        } } onJoin={ async (id) => {
                            await joinRoom(id);
                            setGameState('playing');
                        } } onNameChange={ setPlayerName } name={ playerName }/>
                    </div>
                ) }
                <div className='absolute top-10 right-4 z-100 pointer-events-none'><SystemFeed
                    messages={ systemMessages }/></div>
            </div>
        </div>
    );
}
