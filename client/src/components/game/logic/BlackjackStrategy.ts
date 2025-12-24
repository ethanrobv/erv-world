import type { ActivityStrategy, BJGameState, Card } from "../GameConfig";
import { calculateHand, createInitialState, generateDeck, processNextTurn } from "./Blackjack";

/**
 * Payload interface for strict typing within the Reducer and Action Validator.
 */
interface BlackjackPayload {
    playerId?: string;
    seatIndex?: number;
    amount?: number;
}

export const BlackjackStrategy: ActivityStrategy<BJGameState> = {

    /**
     * Initialization Logic.
     * Generates the deck if missing and removes "zombie" players (players who disconnected).
     */
    onMount: (state, ctx) => {
        const { gameAssets, connections, peerId } = ctx;

        // 1. Initialize Deck in Shared Ref
        // We treat gameAssets.current as Card[] | undefined
        const deck = gameAssets.current as Card[] | undefined;
        if (!deck || !Array.isArray(deck) || deck.length === 0) {
            gameAssets.current = generateDeck();
        }

        // 2. Cleanup Disconnected Peers
        const safeConnections = connections || [];
        const activePeerIds = new Set(safeConnections.map(c => c.peer).filter(id => id));
        if (peerId) activePeerIds.add(peerId);

        let didChange = false;
        const nextSeats = state.seats.map(seat => {
            // If seat is occupied by a peer ID that is no longer active, boot them
            if (seat.status !== 'empty' && seat.peerId && !activePeerIds.has(seat.peerId)) {
                didChange = true;
                return { peerId: null, hand: [], bet: 0, status: 'empty' as const };
            }
            return seat;
        });

        // If changes occurred, return new state. If everyone left, full reset.
        if (didChange) {
            const remainingPlayers = nextSeats.filter(s => s.status !== 'empty');
            if (remainingPlayers.length === 0) return createInitialState();
            return { ...state, seats: nextSeats };
        }

        return state;
    },

    /**
     * Action Validator.
     * Prevents invalid moves and ensures players have sufficient funds for betting.
     */
    onAction: (action, payload, ctx) => {
        const { money, setMoney, peerId } = ctx;

        // Safe cast to access properties without 'any'
        const p = (payload || {}) as Record<string, unknown>;
        const playerId = p.playerId as string | undefined;
        const amount = p.amount as number | undefined;

        // Verify the action comes from the requestor
        if (playerId === peerId) {
            if (action === 'BET' && amount !== undefined) {
                if (money < amount) {
                    console.warn('BlackjackStrategy: Insufficient funds');
                    return false;
                }
                // Deduct money immediately on optimistic update
                setMoney(m => m - amount);
            }
        }
        return true;
    },

    /**
     * Side Effects Monitor.
     * Handles Payouts, Auto-Resets, and Stuck states based on state transitions.
     */
    onStateChange: (prev, curr, ctx) => {
        if (curr.type !== 'blackjack') return;

        const { dispatch, isHost, peerId, setMoney, addAlert } = ctx;

        // 1. HOST: DETECT STUCK TURN
        if (isHost && curr.phase === 'playing' && curr.activeSeatIndex !== -1) {
            const activeSeat = curr.seats[curr.activeSeatIndex];
            // If index points to an invalid seat for 'playing', force a move
            const invalidStatus = ['empty', 'waiting', 'stand', 'bust', 'lost', 'won'];
            if (!activeSeat || invalidStatus.includes(activeSeat.status)) {
                // Dispatch STAND to force processNextTurn to cycle
                setTimeout(() => dispatch('STAND', { seatIndex: curr.activeSeatIndex }), 500);
            }
        }

        // 2. HOST: DETECT EMPTY TABLE
        if (isHost && prev.seats.some(s => s.status !== 'empty') && curr.seats.every(s => s.status === 'empty')) {
            if (curr.phase !== 'idle') dispatch('FULL_RESET');
        }

        // 3. CLIENT: PAYOUTS (Transition to 'payout')
        if (prev.phase !== 'payout' && curr.phase === 'payout') {
            const mySeatIndex = peerId ? curr.seats.findIndex(s => s.peerId === peerId) : -1;

            if (mySeatIndex !== -1) {
                const seat = curr.seats[mySeatIndex];
                const outcomes: Record<string, { mult: number, msg: string }> = {
                    'blackjack': { mult: 2.5, msg: 'Blackjack!' }, // 1.5 payout + bet returned
                    'won': { mult: 2, msg: 'You Won!' },
                    'push': { mult: 1, msg: 'Push.' },
                    'lost': { mult: 0, msg: 'You Lost.' },
                    'bust': { mult: 0, msg: 'Bust.' }
                };

                const res = outcomes[seat.status];
                if (res) {
                    const winnings = seat.bet * res.mult;
                    if (winnings > 0) setMoney(m => m + winnings);

                    const sign = winnings > 0 ? '+' : '-';
                    const val = winnings > 0 ? winnings - seat.bet : seat.bet; // Net gain/loss
                    addAlert(`${ res.msg } ${ sign }$${ Math.abs(val) }`);
                }
            }
        }

        // 4. HOST: AUTO-RESET
        if (isHost && curr.phase === 'payout' && prev.phase !== 'payout') {
            setTimeout(() => {
                dispatch('RESET_ROUND');
            }, 5000);
        }
    },

    /**
     * State Reducer.
     * Pure function that transitions the game state based on actions.
     */
    reducer: (state, action, payload, gameAssetsRef) => {
        // Safe Payload Cast
        const { seatIndex, amount, playerId } = payload as BlackjackPayload;

        // Lazy Deck Accessor
        const getDeck = (): Card[] => {
            const currentDeck = gameAssetsRef.current as Card[] | undefined;
            if (!currentDeck || !Array.isArray(currentDeck) || currentDeck.length === 0) {
                gameAssetsRef.current = generateDeck();
            }
            return gameAssetsRef.current as Card[];
        };

        const runCycle = (s: BJGameState) => processNextTurn(s, getDeck());

        // --- GLOBAL ACTIONS ---

        if (action === 'RESET_ROUND') {
            const nextSeats = state.seats.map(s => {
                if (s.peerId) {
                    // Everyone seated (including previously waiting) moves to betting
                    return { ...s, hand: [], bet: 0, status: 'betting' as const };
                }
                return { ...s, hand: [], bet: 0, status: 'empty' as const };
            });

            return {
                ...state,
                phase: 'betting',
                dealerHand: [],
                activeSeatIndex: -1,
                seats: nextSeats,
                timer: 0
            };
        }

        if (action === 'FULL_RESET') return createInitialState();

        // --- TARGETED ACTIONS ---

        // Ensure seatIndex is defined for targeted actions
        if (seatIndex === undefined) return state;

        const seat = state.seats[seatIndex];

        // Basic seat validation (Allow 'SIT' on empty seats)
        if (!seat && action !== 'RESET' && action !== 'LEAVE' && action !== 'SIT') return state;

        switch (action) {
            case 'SIT':
                if (state.seats[seatIndex].status === 'empty') {
                    const nextSeats = [...state.seats];
                    // Late Join Logic: If round is playing, wait. Else bet.
                    const initialStatus = (state.phase === 'idle' || state.phase === 'betting') ? 'betting' : 'waiting';

                    nextSeats[seatIndex] = {
                        peerId: playerId || null,
                        hand: [],
                        bet: 0,
                        status: initialStatus
                    };

                    const nextState = { ...state, seats: nextSeats };
                    if (nextState.phase === 'idle') nextState.phase = 'betting';
                    return nextState;
                }
                break;

            case 'LEAVE': {
                const nextSeats = [...state.seats];
                nextSeats[seatIndex] = { peerId: null, hand: [], bet: 0, status: 'empty' };

                // If everyone left, reset
                const activeSeated = nextSeats.filter(s => s.peerId !== null);
                if (activeSeated.length === 0) return createInitialState();

                const nextState = { ...state, seats: nextSeats };

                // If active player left during their turn, cycle to next
                if (state.activeSeatIndex === seatIndex && state.phase === 'playing') {
                    return runCycle(nextState);
                }
                return nextState;
            }

            case 'BET':
                if (state.phase === 'betting' && amount !== undefined) {
                    const nextSeats = state.seats.map((s, i) => i === seatIndex ? {
                        ...s, bet: amount, status: 'playing' as const
                    } : s);

                    const nextState = { ...state, seats: nextSeats };

                    // CHECK START CONDITION: Have all eligible players bet?
                    const eligiblePlayers = nextSeats.filter(s => s.peerId && s.status !== 'waiting');
                    const readyPlayers = eligiblePlayers.filter(s => s.status === 'playing');

                    if (eligiblePlayers.length > 0 && eligiblePlayers.length === readyPlayers.length) {
                        const deck = getDeck();

                        // Shuffle if low
                        if (deck.length < 20) {
                            gameAssetsRef.current = generateDeck();
                        }

                        // Deal Cards (2 per player)
                        nextState.seats = nextSeats.map(s => s.status === 'playing' ? {
                            ...s, hand: [getDeck().pop()!, getDeck().pop()!]
                        } : s);

                        // Deal Dealer (1 up, 1 down)
                        const faceUp = getDeck().pop()!;
                        const hole = getDeck().pop()!;
                        hole.isHidden = true;
                        nextState.dealerHand = [faceUp, hole];
                        nextState.phase = 'playing';

                        // Set Active Seat to first playing player
                        let idx = 0;
                        while (idx < nextState.seats.length && nextState.seats[idx].status !== 'playing') idx++;
                        nextState.activeSeatIndex = idx;
                    }
                    return nextState;
                }
                break;

            case 'HIT':
                if (state.activeSeatIndex === seatIndex) {
                    const newHand = [...seat.hand];
                    newHand.push(getDeck().pop()!);

                    const nextSeats = state.seats.map((s, i) => i === seatIndex ? { ...s, hand: newHand } : s);
                    const nextState = { ...state, seats: nextSeats };

                    if (calculateHand(newHand) > 21) {
                        nextState.seats[seatIndex].status = 'bust';
                        return runCycle(nextState);
                    }
                    return nextState;
                }
                break;

            case 'STAND':
                if (state.activeSeatIndex === seatIndex) {
                    const nextSeats = state.seats.map((s, i) => i === seatIndex ? {
                        ...s, status: 'stand' as const
                    } : s);
                    return runCycle({ ...state, seats: nextSeats });
                }
                break;
        }
        return state;
    }
};
