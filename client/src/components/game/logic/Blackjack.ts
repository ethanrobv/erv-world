import type { Card, BJGameState } from '../GameConfig';

/**
 * Generates a standard shuffled Shoe (collection of decks).
 * Defaults to 8 decks (416 cards) to simulate a standard casino shoe.
 * Uses the Fisher-Yates shuffle algorithm.
 *
 * @returns A shuffled array of Card objects.
 */
export const generateDeck = (): Card[] => {
    const suits = ['♠', '♥', '♣', '♦'] as const;
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck: Card[] = [];

    // Create 8 decks
    for (let i = 0; i < 8; i++) {
        for (const s of suits) {
            for (const r of ranks) {
                let val = parseInt(r);
                if (r === 'A') val = 11;
                else if (['J', 'Q', 'K'].includes(r)) val = 10;

                deck.push({ suit: s, rank: r, value: val });
            }
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
 * Calculates the best possible numeric value of a hand.
 * Automatically adjusts Aces from 11 to 1 if the total exceeds 21.
 *
 * @param cards - The array of cards in the hand.
 * @returns The optimized Blackjack score.
 */
export const calculateHand = (cards: Card[]): number => {
    let sum = 0;
    let aces = 0;

    for (const c of cards) {
        if (c.isHidden) continue;
        if (c.rank === 'A') aces++;
        sum += c.value;
    }

    // Downgrade Aces if bust
    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }

    return sum;
};

/**
 * Creates the default empty state for a new Blackjack session.
 * Initializes 5 empty seats and sets the phase to 'idle'.
 *
 * @returns The initial BJGameState.
 */
export const createInitialState = (): BJGameState => ({
    phase: 'idle',
    dealerHand: [],
    seats: Array(5).fill(null).map(() => ({
        peerId: null,
        hand: [],
        bet: 0,
        status: 'empty'
    })),
    activeSeatIndex: -1,
    timer: 0,
    type: 'blackjack'
});

/**
 * Resets the game state for the betting phase.
 * Clears hands and bets for occupied seats, transitioning them to 'betting'.
 *
 * @param current - The current game state.
 * @returns A new game state object transitioned to the 'betting' phase.
 */
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
 * Advances the game flow logic.
 * * 1. Checks if there is another player waiting to act (status === 'playing').
 * 2. If players remain, moves index to that seat.
 * 3. If no players remain, executes the Dealer's turn (hit until soft 17).
 * 4. Determines winners/losers and moves to 'payout'.
 *
 * @param currentState - The current game state (immutable).
 * @param deck - The current game deck (mutable - cards will be popped).
 * @returns The new game state.
 */
export const processNextTurn = (currentState: BJGameState, deck: Card[]): BJGameState => {
    const next: BJGameState = {
        ...currentState,
        dealerHand: [...currentState.dealerHand],
        seats: currentState.seats.map(s => ({ ...s }))
    };

    let nextIndex = next.activeSeatIndex + 1;

    // Search for the next active player
    while (nextIndex < next.seats.length) {
        if (next.seats[nextIndex].status === 'playing') {
            next.activeSeatIndex = nextIndex;
            return next;
        }
        nextIndex++;
    }

    // --- Dealer Turn ---
    next.phase = 'dealerTurn';
    next.activeSeatIndex = -1;

    // Reveal Dealer's hole card
    next.dealerHand = next.dealerHand.map(c => ({ ...c, isHidden: false }));

    let dealerVal = calculateHand(next.dealerHand);

    // Dealer hits on 16 or less (Standard Rules)
    while (dealerVal < 17) {
        const card = deck.pop();
        if (card) {
            next.dealerHand.push(card);
        } else {
            // Edge case: Deck empty during dealer turn
            break;
        }
        dealerVal = calculateHand(next.dealerHand);
    }

    // --- Determine Winners ---
    next.phase = 'payout';

    next.seats.forEach(s => {
        if (s.status === 'stand' || s.status === 'playing') {
            const pVal = calculateHand(s.hand);

            if (pVal > 21) {
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
