import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { DataConnection } from 'peerjs';
import { BlackjackStrategy } from '../components/game/logic/BlackjackStrategy';
import { FishingStrategy } from '../components/game/logic/FishingStrategy';
import type { ActivityContext, ActivityState, ActivityStrategy } from "../components/game/GameConfig";
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

export function useActivity({
                                isHost,
                                peerId,
                                hostConn,
                                connections = [],
                                setMoney,
                                money,
                                addAlert
                            }: UseActivityProps) {

    // 1. COMPOSITE STATE INITIALIZATION
    const [activityState, setActivityState] = useState<ActivityState>(() => {
        const bj = createBJState();
        // @ts-ignore
        const fish = FishingStrategy.onMount!({}, {} as any);
        return {
            blackjack: { ...bj, type: 'blackjack' },
            fishing: { ...fish, type: 'fishing' }
        };
    });

    const gameAssetsRef = useRef<any>([]);
    const prevStateRef = useRef<ActivityState>(activityState);

    // 2. STRATEGY REGISTRY
    const STRATEGIES: Record<string, ActivityStrategy<any>> = useMemo(() => ({
        blackjack: BlackjackStrategy,
        fishing: FishingStrategy
    }), []);

    // 3. PROCESS ACTION (Router)
    const processAction = useCallback((action: string, payload: any) => {
        const { targetActivity, ...restPayload } = payload;

        if (!targetActivity || !STRATEGIES[targetActivity]) return;

        const strategy = STRATEGIES[targetActivity];
        const subState = activityState[targetActivity as keyof ActivityState];

        const ctxLite: ActivityContext = {
            peerId, isHost, money, setMoney, addAlert, gameAssets: gameAssetsRef, connections,
            dispatch: () => console.warn("Validation dispatch blocked")
        };

        if (strategy.onAction) {
            const allowed = strategy.onAction(action, restPayload, ctxLite);
            if (!allowed) return;
        }

        const newSubState = strategy.reducer(subState, action, restPayload, gameAssetsRef);

        setActivityState(prev => ({
            ...prev,
            [targetActivity]: newSubState
        }));

    }, [activityState, STRATEGIES, peerId, isHost, money, setMoney, addAlert, connections]);

    // 4. DISPATCHER
    const dispatch = useCallback((action: string, payload: any = {}) => {
        // FIX: Allow payload.playerId to override peerId.
        // This ensures Host-triggered events (like onTick timers) target the correct player.
        const fullPayload = { playerId: peerId, ...payload };

        if (isHost) {
            processAction(action, fullPayload);
        } else {
            const target = payload.targetActivity;
            if (target && STRATEGIES[target]?.onAction) {
                const ctx: ActivityContext = {
                    peerId, isHost, money, setMoney, addAlert, gameAssets: gameAssetsRef, connections,
                    dispatch: () => {
                    }
                };
                if (!STRATEGIES[target].onAction!(action, fullPayload, ctx)) return;
            }
            hostConn?.send({ type: 'ACTIVITY_ACTION', payload: { action, ...fullPayload } });
        }
    }, [isHost, hostConn, peerId, processAction, STRATEGIES, money, setMoney, addAlert, connections]);

    // 5. CONTEXT FACTORY
    const getContextFor = useCallback((target: string): ActivityContext => ({
        peerId, isHost, money, setMoney, addAlert, gameAssets: gameAssetsRef, connections,
        dispatch: (act, pl) => dispatch(act, { ...pl, targetActivity: target })
    }), [peerId, isHost, money, setMoney, addAlert, dispatch, connections]);

    // 6. EFFECT: STATE MONITORS
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

    // 7. EFFECT: HOST GAME LOOP
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
        }, 200);
        return () => clearInterval(interval);
    }, [isHost, STRATEGIES, getContextFor]);

    const handleRemoteUpdate = useCallback((newState: ActivityState) => {
        setActivityState(prev => JSON.stringify(prev) === JSON.stringify(newState) ? prev : newState);
    }, []);

    return { activityState, dispatch, processAction, handleRemoteUpdate };
}
