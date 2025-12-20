import type { Card, BJGameState } from '../GameConfig';

/**
 * Generates a standard 52-card deck using a Fisher-Yates shuffle.
 */
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

    // Fisher-Yates Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
};

/**
 * Calculates the numeric value of a hand, automatically adjusting Aces from 11 to 1 if needed.
 */
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
    seats: current.seats.map(s =>
        s.status !== 'empty'
            ? { ...s, hand: [], bet: 0, status: 'betting' }
            : s
    ),
    activeSeatIndex: -1
});

/**
 * Advances the game to the next player, or runs the dealer turn if all players are done.
 *
 * @param currentState - The current game state (immutable).
 * @param deck - The current game deck (mutable - cards will be popped).
 */
export const processNextTurn = (currentState: BJGameState, deck: Card[]): BJGameState => {
    // Deep clone specific parts of state we intend to modify
    const next: BJGameState = {
        ...currentState,
        dealerHand: [...currentState.dealerHand],
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
        if (card) {
            next.dealerHand.push(card);
        } else {
            // Deck empty
            break;
        }
        dealerVal = calculateHand(next.dealerHand);
    }

    // 3. Determine Winners (Payout Phase)
    next.phase = 'payout';

    next.seats.forEach(s => {
        // Evaluate players who stood or were still playing (and didn't bust previously)
        if (s.status === 'stand' || s.status === 'playing') {
            const pVal = calculateHand(s.hand);

            if (pVal > 21) {
                // Safety check: if player somehow stood with > 21
                s.status = 'lost';
            } else if (dealerVal > 21 || pVal > dealerVal) {
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
