import type { Card, BJGameState } from '../GameConfig';

/**
 * Generates a 416 (8-deck) sequence of cards.
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
 * Calculates the numeric value of a hand, automatically adjusting Aces from 11 to 1 if needed.
 *
 * @param cards - The array of cards in the hand.
 * @returns The best possible Blackjack value for the hand.
 */
export const calculateHand = (cards: Card[]): number => {
    let sum = 0;
    let aces = 0;

    for (const c of cards) {
        if (c.isHidden) continue;
        if (c.rank === 'A') aces++;
        sum += c.value;
    }

    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }

    return sum;
};

/**
 * Creates the default empty state for a new game session.
 *
 * @returns The initial BJGameState with 5 empty seats.
 */
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
    timer: 0,
    type: 'blackjack'
});

/**
 * Resets the game state for the betting phase.
 * Clears hands and bets for occupied seats, preparing them for a new round.
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
 * Advances the game flow.
 *
 * Checks if there is another player waiting to act. If so, passes the turn to them.
 * If all players have finished, executes the Dealer's turn (hit until 17) and determines winners.
 *
 * @param currentState - The current game state (immutable).
 * @param deck - The current game deck (mutable - cards will be popped).
 * @returns The new game state representing the next turn or end-of-round results.
 */
export const processNextTurn = (currentState: BJGameState, deck: Card[]): BJGameState => {
    const next: BJGameState = {
        ...currentState,
        dealerHand: [...currentState.dealerHand],
        seats: currentState.seats.map(s => ({ ...s }))
    };

    let nextIndex = next.activeSeatIndex + 1;

    // Look for the next seat
    while (nextIndex < next.seats.length) {
        if (next.seats[nextIndex].status === 'playing') {
            next.activeSeatIndex = nextIndex;
            return next;
        }
        nextIndex++;
    }

    // Dealer Turn
    next.phase = 'dealerTurn';
    next.activeSeatIndex = -1;
    next.dealerHand.map((c) => c.isHidden = false);

    let dealerVal = calculateHand(next.dealerHand);
    while (dealerVal < 17) {
        const card = deck.pop();
        if (card) {
            next.dealerHand.push(card);
        } else {
            break;
        }
        dealerVal = calculateHand(next.dealerHand);
    }

    // Determine Winners
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
