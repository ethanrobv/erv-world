// GameConfig.ts
export const MOVEMENT_SPEED = 6;
export const ROTATION_SPEED = 12;

// Transition timings
export const FADE_OUT_DURATION = 1000;
export const FADE_IN_DURATION = 600;

export type GameState = 'menu' | 'playing';
export type SceneType = 'bar' | 'alley';

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

export type Interactable = {
    id: string;
    label: string;
    position: [number, number, number]; // Where the trigger is
    offPosition: [number, number, number]; // Where player model snaps on exit interaction
    inPosition: [number, number, number]; // Where player model snaps on interaction
    inRotation: number; // Where player model rotates on interaction
    interactionRadius: number;
};

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
            // Stool Collisions (0.5 width, leaving 1.5 gap between)
            { x: [-6.25, -5.75], z: [-0.85, -0.35] },
            { x: [-4.25, -3.75], z: [-0.85, -0.35] },
            { x: [-2.25, -1.75], z: [-0.85, -0.35] }
        ],
        portals: [{
            position: [6, 0, -3.9],
            targetScene: 'alley',
            spawnPosition: [6, 0, -2.5],
            spawnRotation: Math.PI
        }],
        interactables: [
            {
                id: 'stool-1',
                label: 'Sit',
                position: [-6, 0, -0.6],
                offPosition: [-6, 0, 0.5],
                inPosition: [-6, 0.75, -0.6], // Lowered visual position
                inRotation: Math.PI,
                interactionRadius: 1.2
            },
            {
                id: 'stool-2',
                label: 'Sit',
                position: [-4, 0, -0.6],
                offPosition: [-4, 0, 0.5],
                inPosition: [-4, 0.75, -0.6], // Lowered visual position
                inRotation: Math.PI,
                interactionRadius: 1.2
            },
            {
                id: 'stool-3',
                label: 'Sit',
                position: [-2, 0, -0.6],
                offPosition: [-2, 0, 0.5],
                inPosition: [-2, 0.75, -0.6], // Lowered visual position
                inRotation: Math.PI,
                interactionRadius: 1.2
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
            spawnRotation: Math.PI
        }],
        interactables: [
            {
                id: 'alley-bench',
                label: 'Sit',
                position: [2.0, 0, -3.6],
                offPosition: [2.0, 0, -2.5],
                inPosition: [2.0, 0.35, -3.6],
                inRotation: 0,
                interactionRadius: 1.8
            }
        ]
    }
};
