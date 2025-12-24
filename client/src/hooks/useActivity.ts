import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { DataConnection } from 'peerjs';
import type {
    ActivityContext,
    ActivityState,
    ActivityStrategy,
    FishingState
} from "../components/game/GameConfig";

import { BlackjackStrategy } from '../components/game/logic/BlackjackStrategy';
import { FishingStrategy } from '../components/game/logic/FishingStrategy';
import { createInitialState as createBJState } from "../components/game/logic/Blackjack";

interface UseActivityProps {
    isHost: boolean;
    peerId: string | null;
    hostConn: DataConnection | null;
    connections: DataConnection[];
    setMoney: React.Dispatch<React.SetStateAction<number>>;
    money: number;
    addAlert: (msg: string) => void;
}

/**
 * Manages the lifecycle, network synchronization, and strategy delegation for multiplayer activities.
 * * This hook acts as a "Game Engine" router. It holds the centralized state for all games
 * (Blackjack, Fishing) and delegates logic (actions, reducers, ticks) to specific strategy modules.
 */
export function useActivity({
                                isHost,
                                peerId,
                                hostConn,
                                connections = [],
                                setMoney,
                                money,
                                addAlert
                            }: UseActivityProps) {

    // Shared mutable storage for heavy game assets (e.g., Card Decks) that persist across renders
    const gameAssetsRef = useRef<unknown>([]);

    // Memoized registry of game logic handlers
    const STRATEGIES: Record<string, ActivityStrategy<unknown>> = useMemo(() => ({
        blackjack: BlackjackStrategy as ActivityStrategy<unknown>,
        fishing: FishingStrategy as ActivityStrategy<unknown>
    }), []);

    // Initialize composite state for all activities
    const [activityState, setActivityState] = useState<ActivityState>(() => {
        // Create a proxy ref for initialization to avoid accessing the real ref during render
        const mockRef = { current: [] };

        const coldContext: ActivityContext = {
            peerId,
            isHost,
            money,
            setMoney,
            addAlert,
            gameAssets: mockRef as React.RefObject<unknown>,
            connections,
            dispatch: () => {
            }
        };

        const bj = createBJState();

        const fishingStart = FishingStrategy.onMount
            ? FishingStrategy.onMount({} as FishingState, coldContext)
            : { type: 'fishing', seats: [], catchLog: {}, env: { isDay: true, isRaining: false } };

        return {
            blackjack: { ...bj, type: 'blackjack' },
            fishing: { ...fishingStart, type: 'fishing' }
        };
    });

    const prevStateRef = useRef<ActivityState>(activityState);

    /**
     * Internal Router: Validates and applies actions to the specific target strategy.
     */
    const processAction = useCallback((action: string, payload: Record<string, unknown>) => {
        const targetActivity = payload.targetActivity as string;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { targetActivity: _, ...restPayload } = payload;

        if (!targetActivity || !STRATEGIES[targetActivity]) return;

        const strategy = STRATEGIES[targetActivity];
        const subState = activityState[targetActivity as keyof ActivityState];

        // Lightweight context for action validation
        const ctxLite: ActivityContext = {
            peerId, isHost, money, setMoney, addAlert, gameAssets: gameAssetsRef, connections,
            dispatch: () => console.warn("Validation dispatch blocked")
        };

        // 1. Validate
        if (strategy.onAction) {
            const allowed = strategy.onAction(action, restPayload, ctxLite);
            if (!allowed) return;
        }

        // 2. Reduce
        const newSubState = strategy.reducer(subState, action, restPayload, gameAssetsRef);

        // 3. Update State
        setActivityState(prev => ({
            ...prev,
            [targetActivity]: newSubState
        }));

    }, [activityState, STRATEGIES, peerId, isHost, money, setMoney, addAlert, connections]);

    /**
     * Public Dispatcher: Handles whether to process locally (Host) or send over network (Client).
     */
    const dispatch = useCallback((action: string, payload: Record<string, unknown> = {}) => {
        const fullPayload = { playerId: peerId, ...payload };

        if (isHost) {
            processAction(action, fullPayload);
        } else {
            // Optimistic Client Validation
            const target = payload.targetActivity as string;
            if (target && STRATEGIES[target]?.onAction) {
                const ctx: ActivityContext = {
                    peerId, isHost, money, setMoney, addAlert, gameAssets: gameAssetsRef, connections,
                    dispatch: () => {
                    }
                };
                if (!STRATEGIES[target].onAction!(action, fullPayload, ctx)) return;
            }
            // Send to Host
            hostConn?.send({ type: 'ACTIVITY_ACTION', payload: { action, ...fullPayload } });
        }
    }, [isHost, hostConn, peerId, processAction, STRATEGIES, money, setMoney, addAlert, connections]);

    // Factory to provide activity-specific context (automatically injects targetActivity)
    const getContextFor = useCallback((target: string): ActivityContext => ({
        peerId, isHost, money, setMoney, addAlert, gameAssets: gameAssetsRef, connections,
        dispatch: (act, pl) => dispatch(act, { ...pl, targetActivity: target })
    }), [peerId, isHost, money, setMoney, addAlert, dispatch, connections]);

    // Effect: Side Effects (onStateChange)
    useEffect(() => {
        Object.keys(STRATEGIES).forEach(key => {
            const strategy = STRATEGIES[key];
            const currentSub = activityState[key as keyof ActivityState];
            const prevSub = prevStateRef.current[key as keyof ActivityState];

            if (strategy.onStateChange && currentSub !== prevSub) {
                strategy.onStateChange(prevSub, currentSub, getContextFor(key));
            }
        });
        prevStateRef.current = activityState;
    }, [activityState, STRATEGIES, getContextFor]);

    // Effect: Host Game Loop (onTick)
    useEffect(() => {
        if (!isHost) return;
        const interval = setInterval(() => {
            const currentGlobal = prevStateRef.current;
            Object.keys(STRATEGIES).forEach(key => {
                const strategy = STRATEGIES[key];
                const subState = currentGlobal[key as keyof ActivityState];
                if (strategy.onTick) {
                    strategy.onTick(subState, getContextFor(key));
                }
            });
        }, 200); // 5hz Tick Rate
        return () => clearInterval(interval);
    }, [isHost, STRATEGIES, getContextFor]);

    // Network Handler
    const handleRemoteUpdate = useCallback((newState: ActivityState) => {
        setActivityState(prev => JSON.stringify(prev) === JSON.stringify(newState) ? prev : newState);
    }, []);

    return { activityState, dispatch, processAction, handleRemoteUpdate };
}
