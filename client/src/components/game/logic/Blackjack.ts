import type { Card, BJGameState } from '../GameConfig';

/* -------------------------------------------------------------------------- */
/* DECK MANAGEMENT                                                            */
/* -------------------------------------------------------------------------- */

export const generateDeck = (): Card[] => {
    const suits = ['♠', '♥', '♣', '♦'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Card[] = [];
    for (const s of suits) {
        for (const r of ranks) {
            let val = parseInt(r);
            if (r === 'A') val = 11;
            else if (['J', 'Q', 'K'].includes(r)) val = 10;
            deck.push({ suit: s, rank: r, value: val });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
};

/* -------------------------------------------------------------------------- */
/* HAND EVALUATION                                                            */
/* -------------------------------------------------------------------------- */

export const calculateHand = (cards: Card[]): number => {
    let sum = 0;
    let aces = 0;
    for (const c of cards) {
        if (c.rank === 'A') aces++;
        sum += c.value;
    }
    // Adjust aces
    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }
    return sum;
};

/* -------------------------------------------------------------------------- */
/* GAME STATE TRANSITIONS                                                     */
/* -------------------------------------------------------------------------- */

export const createInitialState = (): BJGameState => ({
    phase: 'idle',
    dealerHand: [],
    seats: [
        { peerId: null, hand: [], bet: 0, status: 'empty' },
        { peerId: null, hand: [], bet: 0, status: 'empty' },
        { peerId: null, hand: [], bet: 0, status: 'empty' },
        { peerId: null, hand: [], bet: 0, status: 'empty' },
        { peerId: null, hand: [], bet: 0, status: 'empty' }
    ],
    activeSeatIndex: -1,
    timer: 0
});

export const resetForBetting = (current: BJGameState): BJGameState => ({
    ...current,
    phase: 'betting',
    dealerHand: [],
    seats: current.seats.map(s => s.status !== 'empty' ? ({ ...s, hand: [], bet: 0, status: 'betting' }) : s),
    activeSeatIndex: -1
});

/**
 * Advances the game to the next player, or runs the dealer turn if all players are done.
 * Mutates the deck (pops cards) for the dealer.
 */
export const processNextTurn = (currentState: BJGameState, deck: Card[]): BJGameState => {
    // Clone state to avoid direct mutation of the previous render cycle
    const next = {
        ...currentState,
        seats: currentState.seats.map(s => ({ ...s }))
    };

    let nextIndex = next.activeSeatIndex + 1;

    // 1. Look for the next 'playing' seat
    while (nextIndex < next.seats.length) {
        if (next.seats[nextIndex].status === 'playing') {
            next.activeSeatIndex = nextIndex;
            return next; // Turn passes to this player
        }
        nextIndex++;
    }

    // 2. No more players? Dealer Turn.
    next.phase = 'dealerTurn';
    next.activeSeatIndex = -1;

    // Dealer Logic: Hit until 17
    let dealerVal = calculateHand(next.dealerHand);
    while (dealerVal < 17) {
        const card = deck.pop();
        if (card) next.dealerHand.push(card);
        else break; // Should effectively never happen with a fresh deck
        dealerVal = calculateHand(next.dealerHand);
    }

    // 3. Determine Winners (Payout Phase)
    next.phase = 'payout';
    next.seats.forEach(s => {
        // We only evaluate players who have a valid standing hand (or are stuck 'playing' which ends now)
        if (s.status === 'stand' || s.status === 'playing') {
            const pVal = calculateHand(s.hand);

            if (dealerVal > 21 || pVal > dealerVal) {
                s.status = 'won';
            } else if (pVal === dealerVal) {
                s.status = 'push';
            } else {
                s.status = 'lost';
            }
        }
    });

    return next;
};
