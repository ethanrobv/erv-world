/* -------------------------------------------------------------------------- */
/* GLOBAL CONSTANTS & TUNING                                                  */
/* -------------------------------------------------------------------------- */

export const MOVEMENT_SPEED = 6;
export const ROTATION_SPEED = 12;

export const FADE_OUT_DURATION = 1000;
export const FADE_IN_DURATION = 600;

/* -------------------------------------------------------------------------- */
/* CORE STATE TYPES                                                           */
/* -------------------------------------------------------------------------- */

export type GameState = 'menu' | 'playing';
export type SceneType = 'bar' | 'alley';
export type PlayerPose = 'idle' | 'sit';

/* -------------------------------------------------------------------------- */
/* BLACKJACK TYPES                                                            */
/* -------------------------------------------------------------------------- */

export type Card = { suit: '♠' | '♥' | '♣' | '♦'; rank: string; value: number; isHidden?: boolean };

export type BJSeatState = {
    peerId: string | null;
    hand: Card[];
    bet: number;
    status: 'empty' | 'betting' | 'playing' | 'stand' | 'bust' | 'won' | 'lost' | 'push' | 'blackjack';
};

export type BJGameState = {
    phase: 'idle' | 'betting' | 'dealing' | 'playing' | 'dealerTurn' | 'payout';
    dealerHand: Card[];
    seats: BJSeatState[];
    activeSeatIndex: number;
    timer: number;
};

/* -------------------------------------------------------------------------- */
/* WORLD & INTERACTION TYPES                                                  */
/* -------------------------------------------------------------------------- */

export type Barrier = {
    x: [number, number];
    z: [number, number];
};

export type PortalDef = {
    position: [number, number, number];
    targetScene: SceneType;
    spawnPosition: [number, number, number];
    spawnRotation: number;
};

export type InteractionBehavior =
    | {
    type: 'station';
    anchorPosition: [number, number, number];
    anchorRotation: number;
    exitPosition: [number, number, number];
    pose: PlayerPose;
    exitLabel?: string;
}
    | {
    type: 'seat';
    seatIndex: number;
    activity: 'blackjack';
    anchorPosition: [number, number, number];
    anchorRotation: number;
    exitPosition: [number, number, number];
}
    | {
    type: 'trigger';
    autoReset?: boolean;
};

export type Interactable = {
    id: string;
    label: string;
    position: [number, number, number];
    interactionRadius: number;
    behavior: InteractionBehavior;
};

/* -------------------------------------------------------------------------- */
/* NETWORKING TYPES                                                           */
/* -------------------------------------------------------------------------- */

export type RemotePlayerState = {
    pos: [number, number, number];
    rot: number;
    pose: PlayerPose;
    interaction: string | null;
    scene: SceneType;
    isFading?: boolean;
    lastSeen?: number;
    name?: string;
};

/* -------------------------------------------------------------------------- */
/* SCENE DATA CONFIGURATION                                                   */
/* -------------------------------------------------------------------------- */

export const SCENE_DATA: Record<SceneType, {
    barriers: Barrier[],
    portals: PortalDef[],
    interactables?: Interactable[]
}> = {
    bar: {
        barriers: [
            { x: [-50, 5.2], z: [-5, -3.5] },
            { x: [6.8, 50], z: [-5, -3.5] },
            { x: [-7.5, -0.5], z: [-2, -1.2] },
            { x: [-8, -6.5], z: [-4, -1.5] },
            { x: [-1.5, -0.5], z: [-2.75, -1.5] },
            // Table
            { x: [0.0, 6.0], z: [1.0, 4.2] },
            // Barriers for Blackjack Chairs
            { x: [-1.1, -0.5], z: [2.2, 2.8] },
            { x: [0.7, 1.3], z: [4.0, 4.6] },
            { x: [2.7, 3.3], z: [4.0, 4.6] },
            { x: [4.7, 5.3], z: [4.0, 4.6] },
            { x: [6.5, 7.1], z: [2.2, 2.8] },
            // Barriers for Bar Stools
            { x: [-6.3, -5.7], z: [-0.9, -0.3] },
            { x: [-4.3, -3.7], z: [-0.9, -0.3] },
            { x: [-2.3, -1.7], z: [-0.9, -0.3] }
        ],
        portals: [{
            position: [6, 0, -3.9],
            targetScene: 'alley',
            spawnPosition: [6, 0, -2.5],
            spawnRotation: 0
        }],
        interactables: [
            {
                id: 'bj-seat-0',
                label: 'Seat 1',  // left side of table
                position: [-1.0, 0, 2.5],
                interactionRadius: 1.4,
                behavior: {
                    type: 'seat',
                    seatIndex: 0,
                    activity: 'blackjack',
                    anchorPosition: [-0.8, 0.3, 2.6],
                    anchorRotation: Math.PI / 2,
                    exitPosition: [-1.8, 0, 2.5]
                }
            },
            {
                id: 'bj-seat-1',
                label: 'Seat 2',
                position: [1.0, 0, 4.5],
                interactionRadius: 1.2,
                behavior: {
                    type: 'seat',
                    seatIndex: 1,
                    activity: 'blackjack',
                    anchorPosition: [1.0, 0.3, 4.3],
                    anchorRotation: Math.PI,
                    exitPosition: [1.0, 0, 5.5]
                }
            },
            {
                id: 'bj-seat-2',
                label: 'Seat 3',
                position: [3.0, 0, 4.5],
                interactionRadius: 1.2,
                behavior: {
                    type: 'seat',
                    seatIndex: 2,
                    activity: 'blackjack',
                    anchorPosition: [3.0, 0.3, 4.3],
                    anchorRotation: Math.PI,
                    exitPosition: [3.0, 0, 5.5]
                }
            },
            {
                id: 'bj-seat-3',
                label: 'Seat 4',
                position: [5.0, 0, 4.5],
                interactionRadius: 1.2,
                behavior: {
                    type: 'seat',
                    seatIndex: 3,
                    activity: 'blackjack',
                    anchorPosition: [4.9, 0.3, 4.3],
                    anchorRotation: Math.PI,
                    exitPosition: [5.0, 0, 5.5]
                }
            },
            {
                id: 'bj-seat-4',
                label: 'Seat 5',  // right side of table
                position: [7.0, 0, 2.5],
                interactionRadius: 1.4,
                behavior: {
                    type: 'seat',
                    seatIndex: 4,
                    activity: 'blackjack',
                    anchorPosition: [6.8, 0.3, 2.6],
                    anchorRotation: -Math.PI / 2,
                    exitPosition: [7.8, 0, 2.5]
                }
            },
            {
                id: 'stool-1',
                label: 'Sit',
                position: [-6, 0, -0.6],
                interactionRadius: 1.5,
                behavior: {
                    type: 'station',
                    anchorPosition: [-6, 0.45, -0.6],
                    anchorRotation: Math.PI,
                    exitPosition: [-6, 0, 0.5],
                    pose: 'sit',
                    exitLabel: 'Stand Up'
                }
            },
            {
                id: 'stool-2',
                label: 'Sit',
                position: [-4, 0, -0.6],
                interactionRadius: 1.5,
                behavior: {
                    type: 'station',
                    anchorPosition: [-4, 0.45, -0.6],
                    anchorRotation: Math.PI,
                    exitPosition: [-4, 0, 0.5],
                    pose: 'sit',
                    exitLabel: 'Stand Up'
                }
            },
            {
                id: 'stool-3',
                label: 'Sit',
                position: [-2, 0, -0.6],
                interactionRadius: 1.5,
                behavior: {
                    type: 'station',
                    anchorPosition: [-2, 0.45, -0.6],
                    anchorRotation: Math.PI,
                    exitPosition: [-2, 0, 0.5],
                    pose: 'sit',
                    exitLabel: 'Stand Up'
                }
            }
        ]
    },
    alley: {
        barriers: [
            { x: [-50, 5.2], z: [-5, -3.5] },
            { x: [6.8, 50], z: [-5, -3.5] },
            { x: [-6.5, -3.5], z: [-3, -1] },
            { x: [0.25, 2.75], z: [-4.0, -3.2] }
        ],
        portals: [{
            position: [6, 0, -3.9],
            targetScene: 'bar',
            spawnPosition: [6, 0, -2.5],
            spawnRotation: 0
        }],
        interactables: [
            {
                id: 'alley-bench',
                label: 'Sit',
                position: [2.0, 0, -3.6],
                interactionRadius: 1.8,
                behavior: {
                    type: 'station',
                    anchorPosition: [2.0, 0.35, -3.3],
                    anchorRotation: 0,
                    exitPosition: [2.0, 0, -2.5],
                    pose: 'sit',
                    exitLabel: 'Stand Up'
                }
            }
        ]
    }
};
