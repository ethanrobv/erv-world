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
import { useWorkerInterval } from '../hooks/useWorkerInterval';
import { useThemeColor } from '../hooks/useThemeColor';
import {
    type RemotePlayerState,
    type GameState,
    type SceneType,
    type PortalDef,
    type PlayerPose,
    type BJGameState,
    type Card,
    SCENE_DATA,
    FADE_IN_DURATION,
    FADE_OUT_DURATION
} from './game/GameConfig';

// Blackjack Logic
import {
    generateDeck,
    calculateHand,
    createInitialState,
    resetForBetting,
    processNextTurn
} from './game/logic/Blackjack';

// Components
import { BarLevel, AlleyLevel } from './game/GameLevels';
import { Player } from './game/Player';
import {
    MainMenu,
    PauseMenu, // [!code change] Added PauseMenu
    TransitionOverlay,
    InteractionPrompt,
    NetworkIndicator,
    SystemFeed,
    BlackjackHUD
} from './game/GameUI';

/* -------------------------------------------------------------------------- */
/* NETWORK SYNC HELPER                                                        */

/* -------------------------------------------------------------------------- */

function NetworkSync({
                         playerRef,
                         peerId,
                         isHost,
                         hostConn,
                         connections,
                         gameState,
                         interactionLabel,
                         playerPose,
                         setRemotePlayers,
                         worldStateRef,
                         currentScene,
                         addAlert,
                         bjState,
                         setPing,
                         playerName // [!code change] Added name
                     }: {
    playerRef: React.RefObject<THREE.Group | null>;
    peerId: string | null;
    isHost: boolean;
    hostConn: any;
    connections: DataConnection[];
    gameState: GameState;
    interactionLabel: string | null;
    playerPose: PlayerPose;
    setRemotePlayers: React.Dispatch<React.SetStateAction<Record<string, RemotePlayerState>>>;
    worldStateRef: React.RefObject<Record<string, RemotePlayerState>>;
    currentScene: SceneType;
    addAlert: (msg: string) => void;
    bjState: BJGameState;
    setPing?: (ping: number) => void;
    playerName: string;
}) {
    const lastBroadcastRef = useRef(0);
    const lastPruneRef = useRef(0);

    const BROADCAST_RATE_MS = 33;
    const PRUNE_CHECK_RATE_MS = 500;
    const TIMEOUT_MS = 2000;

    const connectionsRef = useRef(connections);
    useEffect(() => {
        connectionsRef.current = connections;
    }, [connections]);

    useWorkerInterval(() => {
        if (!isHost) return;
        const now = Date.now();
        if (now - lastBroadcastRef.current > 500) {
            connectionsRef.current.forEach((conn) => {
                if (conn.open) conn.send({ type: 'HEARTBEAT' });
            });
        }
    }, isHost ? 500 : null);

    useWorkerInterval(() => {
        if (isHost || !hostConn || !hostConn.open) return;
        hostConn.send({ type: 'PING', timestamp: Date.now() });
    }, 1000);

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

    useEffect(() => {
        if (!isHost) return;
        connectionsRef.current.forEach((conn) => {
            if (conn.open) {
                conn.send({ type: 'BJ_STATE', payload: bjState });
            }
        });
    }, [bjState, isHost]);

    useFrame(() => {
        if (gameState !== 'playing' || !playerRef.current || !peerId) return;

        const visuals = playerRef.current.children.find(c => c.type === 'Group') || playerRef.current.children[0];
        const nowMs = Date.now();

        const payload: RemotePlayerState = {
            pos: [playerRef.current.position.x, playerRef.current.position.y, playerRef.current.position.z],
            rot: visuals ? visuals.rotation.y : 0,
            pose: playerPose,
            interaction: interactionLabel,
            scene: currentScene,
            lastSeen: nowMs,
            name: playerName // [!code change] Sync Name
        };

        const shouldSend = (nowMs - lastBroadcastRef.current) > BROADCAST_RATE_MS;

        if (isHost) {
            const existing = worldStateRef.current[peerId];
            worldStateRef.current[peerId] = { ...existing, ...payload };

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
                            setTimeout(() => {
                                const next = { ...worldStateRef.current };
                                delete next[id];
                                worldStateRef.current = next;
                            }, 500);
                        }
                    });
                }
            }

            if (shouldSend) {
                const allIds = Object.keys(worldStateRef.current).sort();
                const heirId = allIds.find(id => id !== peerId) || null;

                const broadcastPayload = {
                    players: worldStateRef.current,
                    heirId: heirId
                };

                setRemotePlayers({ ...worldStateRef.current });
                connectionsRef.current.forEach((conn) => {
                    if (conn.open) {
                        conn.send({ type: 'WORLD_STATE', payload: broadcastPayload });
                    }
                });
                lastBroadcastRef.current = nowMs;
            }
        } else if (hostConn && hostConn.open && shouldSend) {
            hostConn.send({
                type: 'PLAYER_UPDATE',
                payload
            });
            lastBroadcastRef.current = nowMs;
        }
    });

    return null;
}

/* -------------------------------------------------------------------------- */
/* MAIN GAME COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

export default function Game() {
    const { peerId } = useNetwork();
    const [gameState, setGameState] = useState<GameState>('menu');
    const [currentScene, setCurrentScene] = useState<SceneType>('bar');

    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isInputLocked, setIsInputLocked] = useState(false);
    const [isPaused, setIsPaused] = useState(false); // [!code change] Pause State

    const [playerSpawn, setPlayerSpawn] = useState<{ pos: [number, number, number], rot: number }>({
        pos: [6, 0, -2.5],
        rot: Math.PI
    });
    const [interactionLabel, setInteractionLabel] = useState<string | null>(null);
    const [playerPose, setPlayerPose] = useState<PlayerPose>('idle');
    const [systemMessages, setSystemMessages] = useState<Array<{ id: number, text: string }>>([]);
    const [ping, setPing] = useState<number>(0);

    const [money, setMoney] = useState(100);
    const [playerName, setPlayerName] = useState(''); // [!code change] Player Name State

    const [bjState, setBjState] = useState<BJGameState>(createInitialState());

    const mySeatIndex = bjState.seats.findIndex(s => s.peerId === peerId);
    const isSeated = mySeatIndex !== -1;

    const playerRef = useRef<THREE.Group>(null);

    const addAlert = useCallback((text: string) => {
        const id = Date.now();
        setSystemMessages(prev => [...prev, { id, text }]);
        setTimeout(() => setSystemMessages(prev => prev.filter(m => m.id !== id)), 5000);
    }, []);

    // [!code change] Pause Menu Toggle
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Escape' && gameState === 'playing') {
                setIsPaused(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    // Force clear interaction prompt when seated
    useEffect(() => {
        if (isSeated) setInteractionLabel(null);
    }, [isSeated]);

    const deckRef = useRef<Card[]>([]);

    const runTurnCycle = useCallback((currentState: BJGameState) => {
        const nextState = processNextTurn(currentState, deckRef.current);
        if (nextState.phase === 'payout') {
            setTimeout(() => {
                setBjState(prev => resetForBetting(prev));
            }, 5000);
        }
        return nextState;
    }, []);

    const prevPhase = useRef(bjState.phase);
    useEffect(() => {
        if (prevPhase.current !== 'payout' && bjState.phase === 'payout' && mySeatIndex !== -1) {
            const seat = bjState.seats[mySeatIndex];
            if (seat.status === 'won' || seat.status === 'blackjack') {
                const multiplier = seat.status === 'blackjack' ? 2.5 : 2;
                setMoney(m => m + (seat.bet * multiplier));
                addAlert(`You Won $${ seat.bet * multiplier }!`);
            } else if (seat.status === 'push') {
                setMoney(m => m + seat.bet);
                addAlert(`Push - Bet Returned`);
            }
        }
        prevPhase.current = bjState.phase;
    }, [bjState.phase, mySeatIndex, bjState.seats, addAlert]);

    const handleLocalAction = useCallback((action: string, seatIndex: number, amount?: number) => {
        let cardToDeal: Card | null = null;
        let newDeck: Card[] | null = null;

        const currentSeat = bjState.seats[seatIndex];

        if (action === 'HIT') {
            if (bjState.activeSeatIndex === seatIndex) {
                cardToDeal = deckRef.current.pop() || null;
            }
        }

        if (action === 'BET' && bjState.phase === 'betting') {
            const seatedCount = bjState.seats.filter(s => s.peerId).length;
            const readyCount = bjState.seats.filter(s => s.status === 'playing').length;

            if (seatedCount > 0 && readyCount + 1 === seatedCount && amount) {
                newDeck = generateDeck();
                deckRef.current = newDeck;
            }

            if (seatIndex === mySeatIndex && amount) {
                if (money >= amount) {
                    setMoney(m => m - amount);
                } else {
                    return;
                }
            }
        }

        if (action === 'LEAVE') {
            if (seatIndex === mySeatIndex && currentSeat.status === 'betting') {
                setMoney(m => m + currentSeat.bet);
            }
        }

        setBjState(prev => {
            const seat = prev.seats[seatIndex];
            if (!seat) return prev;

            if (action === 'LEAVE') {
                const nextSeats = [...prev.seats];
                nextSeats[seatIndex] = { peerId: null, hand: [], bet: 0, status: 'empty' };
                const nextState = { ...prev, seats: nextSeats };

                if (nextSeats.every(s => s.status === 'empty')) {
                    nextState.phase = 'idle';
                } else if (prev.activeSeatIndex === seatIndex) {
                    return runTurnCycle(nextState);
                }

                return nextState;
            }

            if (action === 'BET' && prev.phase === 'betting' && amount) {
                const nextSeats = prev.seats.map((s, i) => i === seatIndex ? {
                    ...s,
                    bet: amount,
                    status: 'playing' as const
                } : s);
                let nextState = { ...prev, seats: nextSeats };

                const seatedCount = nextSeats.filter(s => s.peerId).length;
                const readyCount = nextSeats.filter(s => s.status === 'playing').length;

                if (seatedCount > 0 && readyCount === seatedCount) {
                    nextState.phase = 'dealing';
                    if (newDeck) deckRef.current = newDeck;
                    else if (deckRef.current.length === 0) deckRef.current = generateDeck();

                    nextState.seats = nextSeats.map(s => {
                        if (s.status === 'playing') {
                            return { ...s, hand: [deckRef.current.pop()!, deckRef.current.pop()!] };
                        }
                        return s;
                    });
                    nextState.dealerHand = [deckRef.current.pop()!];
                    nextState.phase = 'playing';

                    let idx = 0;
                    while (idx < nextState.seats.length && nextState.seats[idx].status !== 'playing') idx++;
                    nextState.activeSeatIndex = idx;
                }
                return nextState;

            } else if (action === 'HIT' && prev.activeSeatIndex === seatIndex) {
                const newHand = [...seat.hand];
                if (cardToDeal) {
                    newHand.push(cardToDeal);
                } else if (!cardToDeal && deckRef.current.length > 0) {
                    newHand.push(deckRef.current.pop()!);
                }

                const nextSeats = prev.seats.map((s, i) => i === seatIndex ? { ...s, hand: newHand } : s);
                let nextState = { ...prev, seats: nextSeats };

                if (calculateHand(newHand) > 21) {
                    nextState.seats[seatIndex].status = 'bust';
                    return runTurnCycle(nextState);
                }
                return nextState;

            } else if (action === 'STAND' && prev.activeSeatIndex === seatIndex) {
                const nextSeats = prev.seats.map((s, i) => i === seatIndex ? { ...s, status: 'stand' as const } : s);
                return runTurnCycle({ ...prev, seats: nextSeats });
            }
            return prev;
        });
    }, [runTurnCycle, bjState, money, mySeatIndex]);

    const handleInteractChange = useCallback((label: string | null) => {
        if (!isSeated) setInteractionLabel(label);
        else setInteractionLabel(null);
    }, [isSeated]);

    const handlePortalEnter = useCallback((portal: PortalDef) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setIsInputLocked(true);
        setInteractionLabel(null);

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

    const worldStateRef = useRef<Record<string, RemotePlayerState>>({});
    const [remotePlayers, setRemotePlayers] = useState<Record<string, RemotePlayerState>>({});
    const [heirId, setHeirId] = useState<string | null>(null);
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

    const {
        isHost,
        roomCode,
        connections,
        hostConn,
        startHosting,
        joinRoom,
        p2pError
    } = useGameP2P(onPeerJoined, onPeerLeft, heirId);

    useEffect(() => {
        if (!isHost) return;
        setBjState(prev => {
            const activeIds = new Set(Object.keys(remotePlayers));
            activeIds.add(peerId || '');

            const needsUpdate = prev.seats.some(s => s.peerId && !activeIds.has(s.peerId));

            if (needsUpdate) {
                return {
                    ...prev,
                    seats: prev.seats.map(s => {
                        if (s.peerId && !activeIds.has(s.peerId)) {
                            return { peerId: null, hand: [], bet: 0, status: 'empty' };
                        }
                        return s;
                    })
                };
            }
            return prev;
        });
    }, [isHost, remotePlayers, peerId]);

    useEffect(() => {
        if (p2pError) {
            addAlert(p2pError);
            setGameState('menu');
        }
    }, [p2pError, addAlert]);

    useEffect(() => {
        if (!isHost) return;
        connections.forEach((conn) => {
            if (initializedConnections.current.has(conn)) return;
            initializedConnections.current.add(conn);

            conn.on('data', (data: any) => {
                if (data.type === 'PLAYER_UPDATE') {
                    const existing = worldStateRef.current[conn.peer];
                    worldStateRef.current[conn.peer] = { ...existing, ...data.payload };
                } else if (data.type === 'HEARTBEAT') {
                    const existing = worldStateRef.current[conn.peer];
                    if (existing) {
                        worldStateRef.current[conn.peer] = { ...existing, lastSeen: Date.now() };
                    }
                } else if (data.type === 'PING') {
                    conn.send({ type: 'PONG', timestamp: data.timestamp });
                    const existing = worldStateRef.current[conn.peer];
                    if (existing) {
                        worldStateRef.current[conn.peer] = { ...existing, lastSeen: Date.now() };
                    }
                } else if (data.type === 'BJ_ACTION') {
                    const { action, seatIndex, amount } = data.payload;

                    if (action === 'SIT') {
                        setBjState(prev => {
                            const next = { ...prev };
                            if (next.seats[seatIndex].status === 'empty') {
                                const nextSeats = [...prev.seats];
                                nextSeats[seatIndex] = { peerId: conn.peer, hand: [], bet: 0, status: 'betting' };
                                next.seats = nextSeats;
                                if (next.phase === 'idle') next.phase = 'betting';
                            }
                            return next;
                        });
                    } else {
                        handleLocalAction(action, seatIndex, amount);
                    }
                }
            });
        });
    }, [isHost, connections, handleLocalAction]);

    useEffect(() => {
        if (isHost || !hostConn) return;
        const handleHostData = (data: any) => {
            if (data.type === 'WORLD_STATE') {
                setRemotePlayers(data.payload.players);
                worldStateRef.current = data.payload.players;
                setHeirId(data.payload.heirId);
            }
            if (data.type === 'BJ_STATE') {
                setBjState(data.payload);
            }
        };
        hostConn.on('data', handleHostData);
        return () => {
            hostConn.off('data', handleHostData);
        };
    }, [hostConn, isHost]);

    const sendBjAction = (action: string, payload: any = {}) => {
        if (isHost) {
            handleLocalAction(action, mySeatIndex, payload.amount);
        } else {
            hostConn?.send({ type: 'BJ_ACTION', payload: { action, seatIndex: mySeatIndex, ...payload } });
        }
    };

    const handleSeatInteract = (seatIndex: number) => {
        if (isHost) {
            setBjState(prev => {
                const next = { ...prev };
                if (next.seats[seatIndex].status === 'empty') {
                    const nextSeats = [...prev.seats];
                    nextSeats[seatIndex] = { peerId: peerId, hand: [], bet: 0, status: 'betting' };
                    next.seats = nextSeats;
                    if (next.phase === 'idle') next.phase = 'betting';
                }
                return next;
            });
        } else {
            hostConn?.send({ type: 'BJ_ACTION', payload: { action: 'SIT', seatIndex } });
        }
    };

    const handleLeaveTable = () => {
        if (mySeatIndex === -1) return;
        sendBjAction('LEAVE');
    };

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
            setGameState('menu');
        }
    };

    // [!code change] Handle Return to Menu
    const handleReturnToMenu = () => {
        window.location.reload(); // Simple reload to clear P2P state cleanly
    };

    const currentSeatLabel = isSeated
        ? SCENE_DATA[currentScene].interactables?.find(i => i.behavior.type === 'seat' && i.behavior.seatIndex === mySeatIndex)?.label
        : null;

    return (
        <div style={ { width: '100%', height: '100%', position: 'relative', overflow: 'hidden' } }>
            <TransitionOverlay isActive={ isTransitioning }/>
            <NetworkIndicator roomCode={ roomCode } isHost={ isHost } ping={ ping }/>
            { !isSeated && <InteractionPrompt label={ interactionLabel }/> }
            <SystemFeed messages={ systemMessages }/>

            {/* [!code change] Render Pause Menu */ }
            { isPaused && (
                <PauseMenu
                    onResume={ () => setIsPaused(false) }
                    onMainMenu={ handleReturnToMenu }
                />
            ) }

            { isSeated && (
                <BlackjackHUD
                    seat={ bjState.seats[mySeatIndex] }
                    dealerHand={ bjState.dealerHand }
                    isMyTurn={ bjState.activeSeatIndex === mySeatIndex }
                    onBet={ (amt) => sendBjAction('BET', { amount: amt }) }
                    onAction={ (act) => sendBjAction(act.toUpperCase()) }
                    onLeave={ handleLeaveTable }
                    seatLabel={ currentSeatLabel }
                    money={ money }
                    exitLabel={ interactionLabel }
                />
            ) }

            { gameState === 'menu' && (
                <MainMenu
                    onHost={ handleHost }
                    onJoin={ handleJoin }
                    onNameChange={ setPlayerName } // [!code change] Pass setter
                    name={ playerName } // [!code change] Pass value
                />
            ) }

            <Canvas shadows dpr={ [1, 2] }>
                <color attach='background' args={ [useThemeColor('--bg-page')] }/>
                <PerspectiveCamera makeDefault position={ [0, 12, 16] } fov={ 40 } near={ 0.1 } far={ 200 }
                                   onUpdate={ (c) => c.lookAt(0, 0, 0) }/>
                <ambientLight intensity={ 0.4 }/>
                <hemisphereLight intensity={ 0.3 } groundColor='#444'/>
                <directionalLight position={ [10, 20, 10] } intensity={ 1.2 } castShadow shadow-mapSize={ [1024, 1024] }
                                  shadow-bias={ -0.0001 }>
                    <orthographicCamera attach='shadow-camera' args={ [-20, 20, 20, -20] }/>
                </directionalLight>
                <pointLight position={ [-10, 5, -5] } intensity={ 0.5 } color='#ccccff'/>

                <NetworkSync
                    playerRef={ playerRef }
                    peerId={ peerId }
                    isHost={ isHost }
                    hostConn={ hostConn }
                    connections={ connections }
                    gameState={ gameState }
                    interactionLabel={ interactionLabel }
                    playerPose={ playerPose }
                    setRemotePlayers={ setRemotePlayers }
                    worldStateRef={ worldStateRef }
                    currentScene={ currentScene }
                    addAlert={ addAlert }
                    bjState={ bjState }
                    setPing={ setPing }
                    playerName={ playerName } // [!code change] Pass Name
                />

                { currentScene === 'bar' ?
                    <BarLevel isDoorOpen={ isDoorOpen } playerRef={ playerRef } dealerHand={ bjState.dealerHand }/> :
                    <AlleyLevel isDoorOpen={ isDoorOpen }/> }

                <Player
                    key={ currentScene }
                    playerRef={ playerRef }
                    isPlaying={ gameState === 'playing' }
                    inputLocked={ isInputLocked || isSeated }
                    initialPos={ playerSpawn.pos }
                    initialRot={ playerSpawn.rot }
                    barriers={ barriers }
                    portals={ portals }
                    interactables={ interactables }
                    onPortalEnter={ handlePortalEnter }
                    onInteractChange={ handleInteractChange }
                    onPoseChange={ setPlayerPose }
                    onSeatInteract={ handleSeatInteract }
                    peerId={ peerId || 'Local' }
                    seatData={ isSeated ? { seatIndex: mySeatIndex, hand: bjState.seats[mySeatIndex].hand } : null }
                    name={ playerName } // [!code change] Pass Name to Local Player
                />

                { Object.entries(remotePlayers).map(([id, data]) => {
                    if (id === peerId) return null;
                    if (data.scene !== currentScene) return null;

                    const seatIdx = bjState.seats.findIndex(s => s.peerId === id);
                    const seatData = seatIdx !== -1 ? { seatIndex: seatIdx, hand: bjState.seats[seatIdx].hand } : null;

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
                            seatData={ seatData }
                        />
                    );
                }) }

                <EffectComposer enableNormalPass={ false }>
                    <Pixelation granularity={ 1 }/>
                    <Bloom luminanceThreshold={ 1 } mipmapBlur intensity={ 1.2 } radius={ 0.5 }/>
                </EffectComposer>
            </Canvas>
        </div>
    );
}
