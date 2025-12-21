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

export type Card = {
    suit: '♠' | '♥' | '♣' | '♦';
    rank: string;
    value: number;
    isHidden?: boolean;
};

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

// Represents an Axis-Aligned Bounding Box (AABB) for collision
export type Barrier = {
    readonly x: readonly [number, number];
    readonly z: readonly [number, number];
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

export type SceneConfig = {
    barriers: Barrier[];
    portals: PortalDef[];
    interactables?: Interactable[];
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
    meta?: Record<string, any>;
};

/* -------------------------------------------------------------------------- */
/* UTILITIES                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Creates a collision barrier from a center point and dimensions.
 * @param x - Center X coordinate
 * @param z - Center Z coordinate
 * @param width - Total width (X axis size)
 * @param depth - Total depth (Z axis size)
 */
const createBarrier = (x: number, z: number, width: number, depth: number): Barrier => {
    const halfW = width / 2;
    const halfD = depth / 2;
    return {
        x: [x - halfW, x + halfW],
        z: [z - halfD, z + halfD]
    };
};

/* -------------------------------------------------------------------------- */
/* SCENE DATA CONFIGURATION                                                   */
/* -------------------------------------------------------------------------- */

export const SCENE_DATA: Record<SceneType, SceneConfig> = {
    bar: {
        barriers: [
            // Architecture
            // Far Left Wall (Back)
            createBarrier(-22.4, -4.25, 55.2, 1.5),
            // Far Right Wall (Back)
            createBarrier(28.4, -4.25, 43.2, 1.5),
            // Bar Counter Main
            createBarrier(-4.0, -1.6, 7.0, 0.9),
            // Bar Side Nook
            createBarrier(-6.8, -2.75, 1.5, 2.5),
            // Bar Entrance Pillar/Divider
            createBarrier(-1.3, -2.3, 1.35, 1.3),

            // Furniture: Blackjack Table
            // Main Table Area
            createBarrier(2.9, 2.4, 6.6, 3.2),
            // Chair 1 (Left)
            createBarrier(-1.2, 2.5, 0.6, 0.6),
            // Chair 2 (Bottom-Left)
            createBarrier(1.0, 4.3, 0.6, 1),
            // Chair 3 (Bottom-Center)
            createBarrier(3.0, 4.3, 0.6, 1),
            // Chair 4 (Bottom-Right)
            createBarrier(5.0, 4.3, 0.6, 1),
            // Chair 5 (Right)
            createBarrier(7.1, 2.5, 0.6, 0.6),

            // Furniture: Bar Stools
            // Left
            createBarrier(-6.0, -0.6, 0.6, 0.6),
            // Center
            createBarrier(-4.0, -0.6, 0.6, 0.6),
            // Right
            createBarrier(-2.0, -0.6, 0.6, 0.6),
        ],
        portals: [{
            position: [6, 0, -3.9],
            targetScene: 'alley',
            spawnPosition: [6, 0, -7],
            spawnRotation: 0
        }],
        interactables: [
            {
                id: 'bj-seat-0',
                label: 'Seat 1',
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
                label: 'Seat 5',
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
            // Deep Back Wall
            createBarrier(0, -10, 30, 1.0),
            // Dumpster / Obstacle Left
            createBarrier(-5.0, -8.0, 3, 2.0),
            // Bench / Obstacle Right
            createBarrier(2, -9.5, 2.8, 1),
        ],
        portals: [{
            position: [6, 0, -10],
            targetScene: 'bar',
            spawnPosition: [6, 0, -1],
            spawnRotation: 0
        }],
        interactables: [
            {
                id: 'alley-bench',
                label: 'Sit',
                position: [2.0, 0, -9.6],
                interactionRadius: 1.8,
                behavior: {
                    type: 'station',
                    anchorPosition: [2.5, 0.35, -8.6],
                    anchorRotation: 0,
                    exitPosition: [2.5, 0, -8.2],
                    pose: 'sit',
                    exitLabel: 'Stand Up'
                }
            },
            {
                id: 'trash-fire',
                label: 'Toggle Fire',
                position: [-5, 0, -2.5], // Vertically between dumpster (z=-8) and street (z=3.5)
                interactionRadius: 1.5,
                behavior: {
                    type: 'trigger'
                }
            },
        ]
    }
};
