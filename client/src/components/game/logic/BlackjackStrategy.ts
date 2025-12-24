import type { ActivityStrategy, BJGameState } from "../GameConfig";
import { calculateHand, createInitialState, generateDeck, processNextTurn } from "./Blackjack";

export const BlackjackStrategy: ActivityStrategy<BJGameState> = {

    // Mount Logic: Sanitize state, initialize deck, remove zombie players
    onMount: (state, ctx) => {
        const bjState = state;
        const { gameAssets, connections, peerId } = ctx;

        if (!gameAssets.current || gameAssets.current.length === 0) {
            gameAssets.current = generateDeck();
        }

        const safeConnections = connections || [];
        const activePeerIds = new Set(safeConnections.map(c => c.peer).filter(id => id));
        if (peerId) activePeerIds.add(peerId);

        let didChange = false;
        const nextSeats = bjState.seats.map(seat => {
            if (seat.status !== 'empty' && seat.peerId && !activePeerIds.has(seat.peerId)) {
                didChange = true;
                return { peerId: null, hand: [], bet: 0, status: 'empty' as const };
            }
            return seat;
        });

        if (didChange) {
            const remainingPlayers = nextSeats.filter(s => s.status !== 'empty');
            if (remainingPlayers.length === 0) return createInitialState();
            return { ...bjState, seats: nextSeats };
        }

        return bjState;
    },

    onAction: (action, payload, ctx) => {
        const { money, setMoney, peerId } = ctx;
        const { playerId, amount } = payload;

        if (playerId === peerId) {
            if (action === 'BET' && amount) {
                if (money < amount) {
                    console.warn('BlackjackStrategy: Insufficient funds');
                    return false;
                }
                setMoney(m => m - amount);
            }
        }
        return true;
    },

    onStateChange: (prev, curr, ctx) => {
        if (curr.type !== 'blackjack') return;

        const prevBj = prev;
        const currBj = curr;
        const { dispatch, isHost, peerId, setMoney, addAlert } = ctx;

        // 1. HOST: DETECT STUCK TURN
        if (isHost && currBj.phase === 'playing' && currBj.activeSeatIndex !== -1) {
            const activeSeat = currBj.seats[currBj.activeSeatIndex];
            // Skip waiting/empty/finished seats
            if (!activeSeat || activeSeat.status === 'empty' || activeSeat.status === 'waiting' || activeSeat.status === 'stand' || activeSeat.status === 'bust') {
                // If we are pointing at an invalid seat, try to move next
                // But better to let processNextTurn handle it. If we are stuck here, force STAND.
                setTimeout(() => dispatch('STAND', { seatIndex: currBj.activeSeatIndex }), 500);
            }
        }

        // 2. HOST: DETECT EMPTY TABLE
        if (isHost && prevBj.seats.some(s => s.status !== 'empty') && currBj.seats.every(s => s.status === 'empty')) {
            if (currBj.phase !== 'idle') dispatch('FULL_RESET');
        }

        // 3. CLIENT: PAYOUTS
        if (prevBj.phase !== 'payout' && currBj.phase === 'payout') {
            const mySeatIndex = peerId ? currBj.seats.findIndex(s => s.peerId === peerId) : -1;
            if (mySeatIndex !== -1) {
                const seat = currBj.seats[mySeatIndex];
                const outcomes: Record<string, { mult: number, msg: string }> = {
                    'blackjack': { mult: 2.5, msg: 'Blackjack!' },
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
                    const val = winnings > 0 ? winnings : seat.bet;
                    addAlert(`${ res.msg } ${ sign }$${ val }`);
                }
            }
        }

        // 4. HOST: AUTO-RESET AFTER PAYOUT
        if (isHost && currBj.phase === 'payout' && prevBj.phase !== 'payout') {
            setTimeout(() => {
                dispatch('RESET_ROUND');
            }, 5000);
        }
    },

    reducer: (state, action, payload, deckRef) => {
        const runCycle = (s: BJGameState) => processNextTurn(s, deckRef.current);

        // --- GLOBAL ACTIONS ---

        // Manual Reset Logic to handle 'waiting' players
        if (action === 'RESET_ROUND') {
            const nextSeats = state.seats.map(s => {
                if (s.peerId) {
                    // Everyone seated (including waiting) moves to betting
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

        const { seatIndex, amount, playerId } = payload;
        const seat = state.seats[seatIndex];

        if (!seat && action !== 'RESET' && action !== 'LEAVE' && action !== 'SIT') return state;

        switch (action) {
            case 'SIT':
                if (state.seats[seatIndex].status === 'empty') {
                    const nextSeats = [...state.seats];
                    // Late Join Logic: If round is playing, they wait. Else they bet.
                    const initialStatus = (state.phase === 'idle' || state.phase === 'betting') ? 'betting' : 'waiting';

                    nextSeats[seatIndex] = {
                        peerId: playerId,
                        hand: [],
                        bet: 0,
                        status: initialStatus
                    };

                    const nextState = { ...state, seats: nextSeats };
                    // If table was idle, start betting
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

                let nextState = { ...state, seats: nextSeats };

                // If active player left, cycle to next
                if (state.activeSeatIndex === seatIndex && state.phase === 'playing') {
                    return runCycle(nextState);
                }

                // If check needed for betting phase (e.g. everyone else bet, this guy left)
                if (state.phase === 'betting') {
                    // Re-evaluate betting triggers
                    const bettors = nextSeats.filter(s => s.status === 'playing');
                    const needToBet = nextSeats.filter(s => s.status === 'betting');

                    if (needToBet.length === 0 && bettors.length > 0) {
                        // Everyone remaining has bet, start game
                        // (Duplicate logic from BET, but simplified trigger)
                        // For safety, we usually let the next BET action trigger it,
                        // or user must manually wait.
                        // Ideally, we'd extract the "Check Start" logic.
                    }
                }

                return nextState;
            }

            case 'BET':
                if (state.phase === 'betting' && amount) {
                    const nextSeats = state.seats.map((s, i) => i === seatIndex ? {
                        ...s, bet: amount, status: 'playing' as const
                    } : s);

                    let nextState = { ...state, seats: nextSeats };

                    // CHECK START CONDITION
                    // Only count players who are actually eligible to play this round
                    // (Ignore 'waiting' players)
                    const eligiblePlayers = nextSeats.filter(s => s.peerId && s.status !== 'waiting');
                    const readyPlayers = eligiblePlayers.filter(s => s.status === 'playing');

                    if (eligiblePlayers.length > 0 && eligiblePlayers.length === readyPlayers.length) {
                        // Ensure Deck
                        if (!deckRef.current || deckRef.current.length < 20) {
                            deckRef.current = generateDeck();
                        }

                        // Deal Cards (Only to 'playing' seats)
                        nextState.seats = nextSeats.map(s => s.status === 'playing' ? {
                            ...s, hand: [deckRef.current.pop()!, deckRef.current.pop()!]
                        } : s);

                        // Deal Dealer
                        const faceUp = deckRef.current.pop()!;
                        const hole = deckRef.current.pop()!;
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
                    if (!deckRef.current || deckRef.current.length === 0) deckRef.current = generateDeck();

                    newHand.push(deckRef.current.pop()!);
                    const nextSeats = state.seats.map((s, i) => i === seatIndex ? { ...s, hand: newHand } : s);

                    let nextState = { ...state, seats: nextSeats };
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
                        ...s,
                        status: 'stand' as const
                    } : s);
                    return runCycle({ ...state, seats: nextSeats });
                }
                break;
        }
        return state;
    }
};
