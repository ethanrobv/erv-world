import type { ActivityStrategy, ActivityContext, FishingState, FishingSeat } from '../GameConfig';
import { selectFish } from './FishingData';

const BASE_BITE_TIME = 8000;
const REACTION_WINDOW = 1000;

// Set of allowed actions for O(1) lookup validation
const VALID_ACTIONS = new Set([
    'JOIN_FISHING',
    'LEAVE',
    'CAST',
    'WIGGLE',
    'TRIGGER_BITE',
    'REEL',
    'FAIL_REEL',
    'RESET',
    'UPDATE_ENV'
]);

// Internal interface for type-safety inside the reducer
interface FishingPayload {
    playerId?: string;
    env?: { isDay: boolean; isRaining: boolean };
}

export const FishingStrategy: ActivityStrategy<FishingState> = {

    /**
     * Initializes the default state for the Fishing activity.
     * Sets up an empty seat registry and default environment conditions.
     */
    onMount: () => {
        return {
            type: 'fishing',
            catchLog: {},
            env: { isDay: true, isRaining: false },
            seats: []
        };
    },

    /**
     * Action Validator.
     * Acts as a gatekeeper to ensure all incoming actions are valid and contain
     * the necessary payload data before reaching the reducer.
     * @param action
     * @param payload - The untrusted payload object from the network.
     */
    onAction: (action, payload) => {
        // 1. Validate Action Existence
        if (!VALID_ACTIONS.has(action)) {
            console.warn(`FishingStrategy: Unknown action rejected: ${ action }`);
            return false;
        }

        // 2. Validate Payload Shape
        // We cast to Record<string, unknown> to safely access properties without
        // assuming their types, allowing for strict runtime checks below.
        const p = (payload || {}) as Record<string, unknown>;

        const playerId = p.playerId;
        const env = p.env as Record<string, unknown> | undefined;

        // Special Case: Environment updates rely on 'env' object, not playerId
        if (action === 'UPDATE_ENV') {
            if (!env || typeof env.isDay !== 'boolean') {
                console.warn("FishingStrategy: Invalid Env Update");
                return false;
            }
            return true;
        }

        // Standard Case: Player Actions require a valid string ID
        if (!playerId || typeof playerId !== 'string') {
            console.warn(`FishingStrategy: Action ${ action } missing valid playerId`);
            return false;
        }

        // 3. Validate Contextual Data
        if (action === 'CAST' && env) {
            if (typeof env.isDay !== 'boolean' || typeof env.isRaining !== 'boolean') {
                console.warn("FishingStrategy: Malformed Env in Cast");
                return false;
            }
        }

        return true;
    },

    /**
     * State Reducer.
     * Handles all state transitions for the fishing gameplay loop:
     * Casting -> Waiting -> Bitten -> Reeling -> Caught/Lost.
     */
    reducer: (state: FishingState, action: string, payload: unknown): FishingState => {
        // Safe to cast to strict type here because onAction has validated the shape
        const { playerId, env } = payload as FishingPayload;

        // Helper to update a specific seat immutably
        const updateSeat = (pId: string, updater: (s: FishingSeat) => FishingSeat) => {
            return {
                ...state,
                seats: state.seats.map(s => s.peerId === pId ? updater(s) : s)
            };
        };

        switch (action) {
            case 'JOIN_FISHING': {
                // Prevent duplicate seats for the same player
                if (!playerId || state.seats.find(s => s.peerId === playerId)) return state;

                // Sync environment if provided during join
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
            }

            case 'LEAVE':
                return {
                    ...state,
                    seats: state.seats.filter(s => s.peerId !== playerId)
                };

            case 'CAST': {
                if (!playerId) return state;
                const castState = env ? { ...state, env } : state;
                return {
                    ...castState,
                    seats: castState.seats.map(s => s.peerId === playerId ? {
                        ...s,
                        phase: 'waiting',
                        // Calculate bite timer: Base time +/- random deviation
                        timer: Date.now() + BASE_BITE_TIME + (Math.random() * 4000 - 2000),
                        biteStrength: 0,
                        lastCatch: null
                    } : s)
                };
            }

            case 'WIGGLE':
                if (!playerId) return state;
                return updateSeat(playerId, s => {
                    if (s.phase !== 'waiting') return s;
                    // Wiggling reduces the wait timer (attracts fish)
                    // but is clamped to a minimum to prevent instant catches.
                    return { ...s, timer: Math.max(Date.now() + 500, s.timer - 200) };
                });

            case 'TRIGGER_BITE':
                if (!playerId) return state;
                return updateSeat(playerId, s => ({
                    ...s,
                    phase: 'bitten',
                    timer: Date.now() + REACTION_WINDOW
                }));

            case 'REEL': {
                if (!playerId) return state;
                const seat = state.seats.find(s => s.peerId === playerId);
                if (!seat || seat.phase !== 'bitten') return state;

                const now = Date.now();

                // Fail if player reacted too late
                if (now > seat.timer) {
                    return updateSeat(playerId, s => ({ ...s, phase: 'lost', timer: 0 }));
                }

                // Success: Determine catch based on current environment
                const result = selectFish(state.env?.isDay ?? true, state.env?.isRaining ?? false);

                // Update shared Catch Log
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
            }

            case 'FAIL_REEL':
                if (!playerId) return state;
                return updateSeat(playerId, s => ({ ...s, phase: 'lost' }));

            case 'RESET':
                if (!playerId) return state;
                return updateSeat(playerId, s => ({ ...s, phase: 'idle', lastCatch: null }));

            case 'UPDATE_ENV':
                return { ...state, env: env || state.env };

            default:
                return state;
        }
    },

    /**
     * Host Game Loop.
     * Runs on the host machine to monitor timers and trigger server-side events
     * (e.g., bites when a timer expires, or failures when a reaction window is missed).
     */
    onTick: (state: FishingState, ctx: ActivityContext) => {
        if (!ctx.isHost) return;
        const now = Date.now();

        state.seats.forEach(seat => {
            // Transition from Waiting -> Bitten
            if (seat.phase === 'waiting' && now >= seat.timer) {
                ctx.dispatch('TRIGGER_BITE', { playerId: seat.peerId });
            }
            // Transition from Bitten -> Lost (Missed reaction)
            if (seat.phase === 'bitten' && now > seat.timer) {
                ctx.dispatch('FAIL_REEL', { playerId: seat.peerId });
            }
        });
    }
};
