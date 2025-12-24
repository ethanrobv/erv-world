import type { LevelData, Barrier } from './GameConfig';

const createBarrier = (x: number, z: number, width: number, depth: number): Barrier => {
    const halfW = width / 2;
    const halfD = depth / 2;
    return {
        x: [x - halfW, x + halfW],
        z: [z - halfD, z + halfD]
    };
};

export const LEVELS: Record<string, LevelData> = {
    bar: {
        barriers: [
            createBarrier(-22.4, -4.25, 56, 1.5),   // Far Left Wall
            createBarrier(28.4, -4.25, 44, 1.5),    // Far Right Wall
            createBarrier(-4.0, -1.6, 7.0, 0.9),    // Bar Counter
            createBarrier(-6.8, -2.75, 1.5, 2.5),   // Bar Nook
            createBarrier(-1.3, -2.3, 1.35, 1.3),   // Pillar
            createBarrier(3, 2.4, 6.8, 4),          // BJ Table Area
            createBarrier(-1, 2.5, 1, 0.8),         // Chair 1
            createBarrier(1, 4.3, 1, 1),            // Chair 2
            createBarrier(3, 4.3, 1, 1),            // Chair 3
            createBarrier(5.0, 4.3, 1, 1),          // Chair 4
            createBarrier(7, 2.5, 1, 0.8),          // Chair 5
            createBarrier(-6.0, -0.6, 0.6, 0.6),    // Stool 1
            createBarrier(-4.0, -0.6, 0.6, 0.6),    // Stool 2
            createBarrier(-2.0, -0.6, 0.6, 0.6),    // Stool 3
        ],
        portals: [{
            position: [6, 0, -3.5],
            targetScene: 'alley',
            spawnPosition: [6, 0, -7],
            spawnRotation: 0
        }],
        interactables: [
            {
                id: 'bj-seat-0', type: 'chair-bj', label: 'Seat 1', position: [-1.0, 0, 2.5], interactionRadius: 1.4, rotation: [0, Math.PI / 2, 0],
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
                id: 'bj-seat-1', type: 'chair-bj', label: 'Seat 2', position: [1.0, 0, 4.5], interactionRadius: 1.2, rotation: [0, Math.PI, 0],
                behavior: {
                    type: 'seat',
                    seatIndex: 1,
                    activity: 'blackjack',
                    anchorPosition: [1.0, 0.05, 4.3],
                    anchorRotation: Math.PI,
                    exitPosition: [1.0, 0, 5.5]
                }
            },
            {
                id: 'bj-seat-2', type: 'chair-bj', label: 'Seat 3', position: [3.0, 0, 4.5], interactionRadius: 1.2, rotation: [0, Math.PI, 0],
                behavior: {
                    type: 'seat',
                    seatIndex: 2,
                    activity: 'blackjack',
                    anchorPosition: [3.0, 0.05, 4.3],
                    anchorRotation: Math.PI,
                    exitPosition: [3.0, 0, 5.5]
                }
            },
            {
                id: 'bj-seat-3', type: 'chair-bj', label: 'Seat 4', position: [5.0, 0, 4.5], interactionRadius: 1.2, rotation: [0, Math.PI, 0],
                behavior: {
                    type: 'seat',
                    seatIndex: 3,
                    activity: 'blackjack',
                    anchorPosition: [4.9, 0.05, 4.3],
                    anchorRotation: Math.PI,
                    exitPosition: [5.0, 0, 5.5]
                }
            },
            {
                id: 'bj-seat-4', type: 'chair-bj', label: 'Seat 5', position: [7.0, 0, 2.5], interactionRadius: 1.4, rotation: [0, -Math.PI / 2, 0],
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
                id: 'stool-1', type: 'stool', label: 'Sit', position: [-6, 0, -0.6], interactionRadius: 1.5,
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
                id: 'stool-2', type: 'stool', label: 'Sit', position: [-4, 0, -0.6], interactionRadius: 1.5,
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
                id: 'stool-3', type: 'stool', label: 'Sit', position: [-2, 0, -0.6], interactionRadius: 1.5,
                behavior: {
                    type: 'station',
                    anchorPosition: [-2, 0.45, -0.6],
                    anchorRotation: Math.PI,
                    exitPosition: [-2, 0, 0.5],
                    pose: 'sit',
                    exitLabel: 'Stand Up'
                }
            }
        ],
        // Extracted from original JSX
        staticProps: [
            {
                id: 'npc-bar',
                type: 'npc-bartender',
                label: '',
                position: [-4, 0, -2.8],
                rotation: [0, Math.PI, 0],
                interactionRadius: 0
            },
            { id: 'lamp-1', type: 'lamp-hanging', label: '', position: [-7, 5, 1], interactionRadius: 0 },
            { id: 'lamp-2', type: 'lamp-hanging', label: '', position: [-1, 5, 1], interactionRadius: 0 },
            { id: 'lamp-3', type: 'lamp-hanging', label: '', position: [3, 5, 1], interactionRadius: 0 },
            { id: 'lamp-4', type: 'lamp-hanging', label: '', position: [9, 5, 1], interactionRadius: 0 },
        ]
    },
    alley: {
        barriers: [
            createBarrier(-4.8, -10, 19.7, 1.0),
            createBarrier(10.8, -10, 7.7, 1.0),
            createBarrier(-5.0, -8.0, 3, 2.0),
            createBarrier(2, -9.5, 2.8, 1),
            // Lake Barrier (Visual only unless we add logic)
            createBarrier(0, 5, 40, 6)
        ],
        portals: [{
            position: [6, 0, -9.3],
            targetScene: 'bar',
            spawnPosition: [6, 0, -1],
            spawnRotation: 0
        }],
        interactables: [
            {
                id: 'alley-bench', type: 'bench', label: 'Sit', position: [2.0, 0, -9.6], interactionRadius: 1.8,
                behavior: {
                    type: 'station',
                    anchorPosition: [2.5, 0.35, -9],
                    anchorRotation: 0,
                    exitPosition: [2.5, 0, -8.2],
                    pose: 'sit',
                    exitLabel: 'Stand Up'
                }
            },
            {
                id: 'trash-fire',
                type: 'fire-trash',
                label: 'Toggle Fire',
                position: [8.5, 0, -6.5],
                interactionRadius: 1.5,
                behavior: { type: 'trigger' }
            },
        ],
        waterZones: [
            { x: [-20, 20], z: [0, 10] }
        ],
        staticProps: [
            {
                id: 'dumpster',
                type: 'dumpster',
                label: '',
                position: [-5, 0, -8],
                rotation: [0, 0.2, 0],
                interactionRadius: 0
            },
            {
                id: 'box-1',
                type: 'box',
                label: '',
                position: [-2, 0.4, -8],
                rotation: [0, 0.5, 0],
                interactionRadius: 0,
                size: 0.8
            },
            {
                id: 'box-2',
                type: 'box',
                label: '',
                position: [-1.9, 1.1, -7.9],
                rotation: [0, 0.2, 0],
                interactionRadius: 0,
                size: 0.6
            },
            { id: 'npc-smoke', type: 'npc-smoker', label: '', position: [1.3, 0.45, -9], interactionRadius: 0 },

            // Plants along the water edge
            { id: 'reed-1', type: 'reed', label: '', position: [-9, 0, 3.5], interactionRadius: 0 },
            { id: 'reed-2', type: 'reed', label: '', position: [-7.5, 0, 2.1], interactionRadius: 0 },
            { id: 'reed-3', type: 'reed', label: '', position: [-3, 0, 1.1], interactionRadius: 0 },
            { id: 'reed-4', type: 'reed', label: '', position: [4, 0, 1.4], interactionRadius: 0 },
            { id: 'reed-5', type: 'reed', label: '', position: [10, 0, 2.1], interactionRadius: 0 },
        ]
    }
};
