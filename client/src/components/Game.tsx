import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DataConnection } from 'peerjs';

// 3D & Effects
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { Bloom, EffectComposer, Pixelation } from '@react-three/postprocessing';
import * as THREE from 'three';

// Game Context & Hooks
import { useNetwork } from '../context/NetworkContext';
import { useGameP2P } from '../hooks/useGameP2P';
import { useThemeColor } from '../hooks/useThemeColor';

// Config & Types
import {
    type BJGameState,
    type Card,
    FADE_IN_DURATION,
    FADE_OUT_DURATION,
    type GameState,
    type PlayerPose,
    type PortalDef,
    type RemotePlayerState,
    SCENE_DATA,
    type SceneType
} from './game/GameConfig';

// Logic
import {
    calculateHand,
    createInitialState,
    generateDeck,
    processNextTurn,
    resetForBetting
} from './game/logic/Blackjack';

// Components
import { AlleyLevel, BarLevel } from './game/GameLevels';
import { Player } from './game/Player';
import { NetworkSync } from './game/NetworkSync';
import {
    BlackjackHUD,
    InteractionPrompt,
    MainMenu,
    NetworkIndicator,
    PauseMenu,
    SystemFeed,
    TransitionOverlay
} from './game/ui';

/* -------------------------------------------------------------------------- */
/* MAIN GAME COMPONENT                                                        */
/* -------------------------------------------------------------------------- */

export default function Game() {
    const { peerId } = useNetwork();

    // Game State
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

    // [OPTIMIZATION] Removed State-based interaction label
    const promptRef = useRef<HTMLDivElement>(null);
    const interactionStateRef = useRef<{ label: string | null }>({ label: null });

    const [playerPose, setPlayerPose] = useState<PlayerPose>('idle');
    const [playerName, setPlayerName] = useState('');
    const [money, setMoney] = useState(100);

    // Object State
    const [isFireLit, setIsFireLit] = useState(true);

    // UI State
    const [systemMessages, setSystemMessages] = useState<Array<{ id: number; text: string }>>([]);
    const [ping, setPing] = useState<number>(0);

    // Blackjack State
    const [bjState, setBjState] = useState<BJGameState>(createInitialState());
    const deckRef = useRef<Card[]>([]);

    // Refs
    const playerRef = useRef<THREE.Group>(null);
    const visualsRef = useRef<THREE.Group>(null);

    // [OPTIMIZATION] Single Source of Truth for Positions
    const worldStateRef = useRef<Record<string, RemotePlayerState>>({});
    const initializedConnections = useRef<WeakSet<DataConnection>>(new WeakSet());

    // Alerts Callback
    const addAlert = useCallback((text: string) => {
        const id = Date.now();
        setSystemMessages(prev => [...prev, { id, text }]);
        setTimeout(() => setSystemMessages(prev => prev.filter(m => m.id !== id)), 3000);
    }, []);

    // P2P Hook
    const [remotePlayers, setRemotePlayers] = useState<Record<string, RemotePlayerState>>({});
    const [heirId, setHeirId] = useState<string | null>(null);

    const onPeerJoined = useCallback((id: string) => {
        addAlert(`Player ${ id.substring(0, 4).toUpperCase() } joined`);
    }, [addAlert]);

    const onPeerLeft = useCallback((id: string) => {
        if (worldStateRef.current[id]) {
            worldStateRef.current[id].isFading = true;
            addAlert(`Player ${ id.substring(0, 4).toUpperCase() } left`);

            // Force update to trigger fade out logic
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
        joinRoom,
        p2pError
    } = useGameP2P(onPeerJoined, onPeerLeft, heirId);

    // Host Migration
    useEffect(() => {
        if (isHost) {
            const isGameActive = bjState.phase !== 'idle' && bjState.phase !== 'betting';
            if (isGameActive && deckRef.current.length === 0) {
                const freshDeck = generateDeck();
                const visibleCards = new Set<string>();
                bjState.dealerHand.forEach(c => visibleCards.add(`${ c.rank }-${ c.suit }`));
                bjState.seats.forEach(s => s.hand.forEach(c => visibleCards.add(`${ c.rank }-${ c.suit }`)));
                deckRef.current = freshDeck.filter(c => !visibleCards.has(`${ c.rank }-${ c.suit }`));
                addAlert('You are now the Host. Game resumed.');
            }
        }
    }, [isHost, bjState, addAlert]);

    const mySeatIndex = bjState.seats.findIndex(s => s.peerId === peerId);
    const isSeated = mySeatIndex !== -1;

    // --- LOGIC: UI Toggles & Input ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Escape' && gameState === 'playing') {
                setIsPaused(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState]);

    useEffect(() => {
        if (isSeated) {
            if (promptRef.current) promptRef.current.style.opacity = '0';
        }
    }, [isSeated]);

    // --- LOGIC: Blackjack State Handling ---
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
            if (seat.status === 'lost' || seat.status === 'bust') {
                addAlert(`You lost $${ seat.bet }.`);
            } else if (seat.status === 'won' || seat.status === 'blackjack') {
                const multiplier = seat.status === 'blackjack' ? 2.5 : 2;
                setMoney(m => m + (seat.bet * multiplier));
                addAlert(`You won $${ seat.bet * multiplier }!`);
            } else if (seat.status === 'push') {
                setMoney(m => m + seat.bet);
                addAlert(`Push. $${ seat.bet } returned.`);
            }
        }
        prevPhase.current = bjState.phase;
    }, [bjState.phase, mySeatIndex, bjState.seats, addAlert]);

    const handleLocalAction = useCallback((action: string, seatIndex: number, amount?: number, extraPayload?: any) => {
        let cardToDeal: Card | null = null;
        let newDeck: Card[] | null = null;
        const currentSeat = bjState.seats[seatIndex];

        if (action === 'HIT' && bjState.activeSeatIndex === seatIndex) {
            cardToDeal = deckRef.current.pop() || null;
        }

        if (action === 'BET' && bjState.phase === 'betting') {
            const seatedCount = bjState.seats.filter(s => s.peerId).length;
            const readyCount = bjState.seats.filter(s => s.status === 'playing').length;
            if (seatedCount > 0 && readyCount + 1 === seatedCount && amount) {
                newDeck = generateDeck();
                deckRef.current = newDeck;
            }
            if (seatIndex === mySeatIndex && amount) {
                if (money >= amount) setMoney(m => m - amount);
                else return;
            }
        }

        if (action === 'LEAVE' && seatIndex === mySeatIndex && currentSeat.status === 'betting') {
            setMoney(m => m + currentSeat.bet);
        }

        setBjState(prev => {
            const seat = prev.seats[seatIndex];
            if (!seat) return prev;

            if (action === 'SIT') {
                if (seat.status === 'empty') {
                    const nextSeats = [...prev.seats];
                    nextSeats[seatIndex] = {
                        peerId: extraPayload?.playerId || peerId,
                        hand: [],
                        bet: 0,
                        status: 'betting'
                    };
                    const nextState = { ...prev, seats: nextSeats };
                    if (nextState.phase === 'idle') nextState.phase = 'betting';
                    return nextState;
                }
                return prev;
            }

            if (action === 'LEAVE') {
                const nextSeats = [...prev.seats];
                nextSeats[seatIndex] = { peerId: null, hand: [], bet: 0, status: 'empty' };
                const activeSeatedPlayers = nextSeats.filter(s => s.peerId !== null);
                if (prev.phase === 'playing' || prev.phase === 'dealing') {
                    addAlert(`Player forfeit ${ seat.bet }.`);
                }
                if (activeSeatedPlayers.length === 0) return createInitialState();
                let nextState = { ...prev, seats: nextSeats };
                if (prev.activeSeatIndex === seatIndex && prev.phase === 'playing') return runTurnCycle(nextState);
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
                    nextState.seats = nextSeats.map(s => s.status === 'playing' ? {
                        ...s,
                        hand: [deckRef.current.pop()!, deckRef.current.pop()!]
                    } : s);
                    nextState.dealerHand = [deckRef.current.pop()!];
                    nextState.phase = 'playing';
                    let idx = 0;
                    while (idx < nextState.seats.length && nextState.seats[idx].status !== 'playing') idx++;
                    nextState.activeSeatIndex = idx;
                }
                return nextState;
            } else if (action === 'HIT' && prev.activeSeatIndex === seatIndex) {
                const newHand = [...seat.hand];
                if (cardToDeal) newHand.push(cardToDeal);
                else if (deckRef.current.length > 0) newHand.push(deckRef.current.pop()!);

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
    }, [runTurnCycle, bjState, money, mySeatIndex, peerId, addAlert]);

    // --- LOGIC: Interaction & Navigation ---
    const handleInteractChange = useCallback((_label: string | null) => {
        // Fallback or purely logic updates
        // UI is updated directly via ref in Player loop
    }, []);

    const handlePortalEnter = useCallback((portal: PortalDef) => {
        if (isTransitioning) return;
        setIsTransitioning(true);
        setIsInputLocked(true);
        if (promptRef.current) promptRef.current.style.opacity = '0';
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

    // --- LOGIC: Networking ---

    // 1. EXTENSIBLE HANDLERS
    const networkHandlers = useMemo(() => ({
        'PLAYER_UPDATE': (data: any, conn: DataConnection) => {
            const existing = worldStateRef.current[conn.peer];
            const newData = { ...existing, ...data.payload };
            worldStateRef.current[conn.peer] = newData;
            setRemotePlayers(prev => {
                const oldData = prev[conn.peer];
                if (!oldData || oldData.scene !== newData.scene) {
                    return { ...prev, [conn.peer]: newData };
                }
                return prev;
            });
        },
        'WORLD_SNAPSHOT': (data: any) => {
            const { players, game, heirId } = data.payload;
            worldStateRef.current = players;
            setRemotePlayers(prev => {
                const prevKeys = Object.keys(prev);
                const newKeys = Object.keys(players);
                if (prevKeys.length !== newKeys.length) return players;
                if (!newKeys.every(k => prev.hasOwnProperty(k))) return players;
                if (newKeys.some(key => prev[key].scene !== players[key].scene)) return players;
                return prev;
            });
            setBjState(prev => {
                if (JSON.stringify(prev) !== JSON.stringify(game)) return game;
                return prev;
            });
            setHeirId(heirId);
        },
        'BJ_ACTION': (data: any, conn: DataConnection) => {
            const { action, seatIndex, amount, ...extra } = data.payload;
            handleLocalAction(action, seatIndex, amount, { ...extra, playerId: conn.peer });
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
        'PONG': (data: any) => {
            setPing(Date.now() - data.timestamp);
        },
        'GAME_EVENT': (data: any) => {
            if (data.payload.id === 'trash-fire') setIsFireLit(data.payload.value);
        }
    }), [handleLocalAction]);

    // 2. Host Listener
    useEffect(() => {
        if (!isHost) return;
        connections.forEach((conn) => {
            if (initializedConnections.current.has(conn)) return;
            initializedConnections.current.add(conn);
            conn.on('data', (data: any) => {
                const handler = networkHandlers[data.type as keyof typeof networkHandlers];
                if (handler) handler(data, conn);
            });
        });
    }, [isHost, connections, networkHandlers]);

    // 3. Client Listener
    useEffect(() => {
        if (isHost || !hostConn) return;
        const handleHostData = (data: any) => {
            const handler = networkHandlers[data.type as keyof typeof networkHandlers];
            if (handler) handler(data, hostConn);
        };
        hostConn.on('data', handleHostData);
        return () => {
            hostConn.off('data', handleHostData);
        };
    }, [hostConn, isHost, networkHandlers]);

    // 4. Host-side Cleanup: Player Disconnect
    useEffect(() => {
        if (!isHost) return;
        setBjState(prev => {
            const activeIds = new Set(Object.keys(remotePlayers));
            activeIds.add(peerId || '');
            const needsUpdate = prev.seats.some(s => s.peerId && !activeIds.has(s.peerId));

            if (needsUpdate) {
                const nextSeats = prev.seats.map(s => {
                    if (s.peerId && !activeIds.has(s.peerId)) {
                        return { peerId: null, hand: [], bet: 0, status: 'empty' as const };
                    }
                    return s;
                });

                const activePlayers = nextSeats.filter(s => s.status !== 'empty');
                if (activePlayers.length === 0) {
                    return createInitialState();
                }

                let nextState = { ...prev, seats: nextSeats };

                if (prev.phase === 'playing') {
                    return runTurnCycle(nextState);
                }

                return nextState;
            }
            return prev;
        });
    }, [isHost, remotePlayers, peerId, runTurnCycle]);

    // --- Error Handling & Cleanup ---
    useEffect(() => {
        if (p2pError) {
            addAlert(p2pError);
            setGameState('menu');
        }
    }, [p2pError, addAlert]);

    // --- Actions ---
    const sendBjAction = (action: string, payload: any = {}) => {
        const seatIdx = mySeatIndex;
        if (isHost) handleLocalAction(action, seatIdx, payload.amount, payload);
        else hostConn?.send({ type: 'BJ_ACTION', payload: { action, seatIndex: seatIdx, ...payload } });
    };

    const handleSeatInteract = (seatIndex: number) => {
        if (isHost) handleLocalAction('SIT', seatIndex, 0, { playerId: peerId });
        else hostConn?.send({ type: 'BJ_ACTION', payload: { action: 'SIT', seatIndex } });
    };

    const handleTriggerInteract = useCallback((id: string) => {
        if (id === 'trash-fire') {
            setIsFireLit(prev => {
                const newVal = !prev;
                if (isHost) connections.forEach(c => c.send({
                    type: 'GAME_EVENT',
                    payload: { id: 'trash-fire', value: newVal }
                }));
                return newVal;
            });
        }
    }, [isHost, connections]);

    const handleLeaveTable = () => {
        if (mySeatIndex === -1) return;
        sendBjAction('LEAVE');
    };

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

    const handleReturnToMenu = () => {
        sessionStorage.setItem('reopen_game', 'true');
        window.location.reload();
    };

    const currentInteractable = SCENE_DATA[currentScene].interactables?.find(
        (i) => i.behavior.type === 'seat' && i.behavior.seatIndex === mySeatIndex
    );

    const mySyncData = useMemo(() => ({
        money: money,
        isPaused: isPaused
    }), [money, isPaused]);

    return (
        <div style={ { width: '100%', height: '100%', position: 'relative', overflow: 'hidden' } }>
            <TransitionOverlay isActive={ isTransitioning }/>
            <NetworkIndicator roomCode={ roomCode } isHost={ isHost } ping={ ping }/>

            {/* [OPTIMIZATION] Pass ref to UI element */ }
            { !isSeated && <InteractionPrompt ref={ promptRef }/> }

            <SystemFeed messages={ systemMessages }/>

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
                    seatLabel={ isSeated ? currentInteractable?.label : null }
                    money={ money }
                    exitLabel={ isSeated ? (currentInteractable?.behavior as any).exitLabel || 'Stand Up' : null }
                />
            ) }

            { gameState === 'menu' && (
                <MainMenu
                    onHost={ handleHost }
                    onJoin={ handleJoin }
                    onNameChange={ setPlayerName }
                    name={ playerName }
                />
            ) }

            <Canvas
                shadows
                dpr={ [1, 2] }
                gl={ {
                    toneMapping: THREE.ReinhardToneMapping,
                    toneMappingExposure: 1.2,
                    antialias: false
                } }
            >
                <color attach='background' args={ [useThemeColor('--bg-page')] }/>
                <PerspectiveCamera
                    makeDefault
                    position={ [0, 12, 16] }
                    fov={ 40 }
                    near={ 0.1 }
                    far={ 200 }
                    onUpdate={ (c) => c.lookAt(0, 0, 0) }
                />

                <ambientLight intensity={ 0.15 }/>
                <hemisphereLight intensity={ 0.1 } groundColor='#000'/>

                <NetworkSync
                    playerRef={ playerRef }
                    visualsRef={ visualsRef }
                    peerId={ peerId }
                    isHost={ isHost }
                    hostConn={ hostConn }
                    connections={ connections }
                    gameState={ gameState }

                    // [OPTIMIZATION] Pass ref for high-freq updates
                    interactionRef={ interactionStateRef }

                    playerPose={ playerPose }
                    setRemotePlayers={ setRemotePlayers }
                    worldStateRef={ worldStateRef }
                    currentScene={ currentScene }
                    addAlert={ addAlert }
                    bjState={ bjState }
                    setPing={ setPing }
                    playerName={ playerName }
                    syncData={ mySyncData }
                />

                { currentScene === 'bar'
                    ? <BarLevel isDoorOpen={ isDoorOpen } dealerHand={ bjState.dealerHand }/>
                    : <AlleyLevel isDoorOpen={ isDoorOpen } isFireLit={ isFireLit }/>
                }

                <Player
                    key={ currentScene }
                    playerRef={ playerRef }
                    visualsRef={ visualsRef }

                    // [OPTIMIZATION] Pass UI refs to game loop
                    promptRef={ promptRef }
                    interactionStateRef={ interactionStateRef }

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
                    onTriggerInteract={ handleTriggerInteract }
                    peerId={ peerId || 'Local' }
                    seatData={ isSeated ? { seatIndex: mySeatIndex, hand: bjState.seats[mySeatIndex].hand } : null }
                    name={ playerName }
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

                <EffectComposer enableNormalPass={ false }>
                    <Pixelation granularity={ 1 }/>
                    <Bloom luminanceThreshold={ 1 } intensity={ 1.2 } radius={ 0.5 }/>
                </EffectComposer>
            </Canvas>
        </div>
    );
}
