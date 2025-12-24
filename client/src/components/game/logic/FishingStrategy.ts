import type { ActivityStrategy, ActivityContext, FishingState, FishingSeat } from '../GameConfig';
import { selectFish } from './FishingData';

const BASE_BITE_TIME = 8000;
const REACTION_WINDOW = 1000;

// Validation Helper
const isValidFishingAction = (action: string): boolean => {
    const validActions = new Set([
        'JOIN_FISHING', 'LEAVE', 'CAST', 'WIGGLE',
        'TRIGGER_BITE', 'REEL', 'FAIL_REEL', 'RESET', 'UPDATE_ENV'
    ]);
    return validActions.has(action);
};

export const FishingStrategy: ActivityStrategy<FishingState> = {

    onMount: () => {
        return {
            type: 'fishing',
            catchLog: {},
            env: { isDay: true, isRaining: false },
            seats: []
        };
    },

    // IMPLEMENTED: Gatekeeper Logic
    onAction: (action, payload, _ctx) => {
        // 1. Unknown Action Check
        if (!isValidFishingAction(action)) {
            console.warn(`FishingStrategy: Unknown action rejected: ${ action }`);
            return false;
        }

        // 2. Payload Integrity Checks
        const { playerId, env } = payload || {};

        if (action === 'UPDATE_ENV') {
            if (!env || typeof env.isDay !== 'boolean') {
                console.warn("FishingStrategy: Invalid Env Update");
                return false;
            }
            return true;
        }

        // All other actions require a valid Player ID
        if (!playerId || typeof playerId !== 'string') {
            console.warn(`FishingStrategy: Action ${ action } missing valid playerId`);
            return false;
        }

        // 3. Contextual Checks (Example: Casting requirements)
        if (action === 'CAST' && env) {
            // If environment is provided during cast, validate it
            if (typeof env.isDay !== 'boolean' || typeof env.isRaining !== 'boolean') {
                console.warn("FishingStrategy: Malformed Env in Cast");
                return false;
            }
        }

        return true;
    },

    reducer: (state: FishingState, action: string, payload: any): FishingState => {
        const { playerId, env } = payload;

        // Helper to update a specific seat
        const updateSeat = (pId: string, updater: (s: FishingSeat) => FishingSeat) => {
            return {
                ...state,
                seats: state.seats.map(s => s.peerId === pId ? updater(s) : s)
            };
        };

        switch (action) {
            case 'JOIN_FISHING':
                // Logic: Prevent duplicates
                if (state.seats.find(s => s.peerId === playerId)) return state;

                // Sync env if provided on join
                const joinState = env ? { ...state, env } : state;

                return {
                    ...joinState,
                    seats: [...joinState.seats, {
                        peerId: playerId,
                        phase: 'idle',
                        timer: 0,
                        biteStrength: 0,
                        lastCatch: null
                    }]
                };

            case 'LEAVE':
                return {
                    ...state,
                    seats: state.seats.filter(s => s.peerId !== playerId)
                };

            case 'CAST':
                const castState = env ? { ...state, env } : state;
                return {
                    ...castState,
                    seats: castState.seats.map(s => s.peerId === playerId ? {
                        ...s,
                        phase: 'waiting',
                        timer: Date.now() + BASE_BITE_TIME + (Math.random() * 4000 - 2000),
                        biteStrength: 0,
                        lastCatch: null
                    } : s)
                };

            case 'WIGGLE':
                return updateSeat(playerId, s => {
                    if (s.phase !== 'waiting') return s;
                    // Wiggling reduces timer (attracts fish) but clamps to 500ms min
                    return { ...s, timer: Math.max(Date.now() + 500, s.timer - 200) };
                });

            case 'TRIGGER_BITE':
                return updateSeat(playerId, s => ({
                    ...s,
                    phase: 'bitten',
                    timer: Date.now() + REACTION_WINDOW
                }));

            case 'REEL':
                const seat = state.seats.find(s => s.peerId === playerId);
                if (!seat || seat.phase !== 'bitten') return state;

                const now = Date.now();
                if (now > seat.timer) {
                    return updateSeat(playerId, s => ({ ...s, phase: 'lost', timer: 0 }));
                }

                // Success! Select fish based on current environment
                const result = selectFish(state.env?.isDay ?? true, state.env?.isRaining ?? false);

                const newLog = {
                    ...state.catchLog,
                    [result.fishId]: {
                        count: (state.catchLog[result.fishId]?.count || 0) + 1,
                        maxWeight: Math.max((state.catchLog[result.fishId]?.maxWeight || 0), result.weight)
                    }
                };

                return {
                    ...state,
                    catchLog: newLog,
                    seats: state.seats.map(s => s.peerId === playerId ? {
                        ...s,
                        phase: 'caught',
                        lastCatch: result
                    } : s)
                };

            case 'FAIL_REEL':
                return updateSeat(playerId, s => ({ ...s, phase: 'lost' }));

            case 'RESET':
                return updateSeat(playerId, s => ({ ...s, phase: 'idle', lastCatch: null }));

            case 'UPDATE_ENV':
                return { ...state, env: env || state.env };

            default:
                return state;
        }
    },

    onTick: (state: FishingState, ctx: ActivityContext) => {
        if (!ctx.isHost) return;
        const now = Date.now();

        state.seats.forEach(seat => {
            if (seat.phase === 'waiting' && now >= seat.timer) {
                // Dispatch targeted event
                ctx.dispatch('TRIGGER_BITE', { playerId: seat.peerId });
            }
            if (seat.phase === 'bitten' && now > seat.timer) {
                // Timeout missed bite
                ctx.dispatch('FAIL_REEL', { playerId: seat.peerId });
            }
        });
    }
};
