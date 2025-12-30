import { useEffect, useRef } from 'react';

/**
 * Logical Input State.
 * These are the actions the game understands, decoupled from specific physical keys.
 * This abstraction allows us to change keybindings (e.g. support AZERTY) without
 * changing any game logic.
 */
export interface KeyboardInput {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    run: boolean;
    jump: boolean;
    crouch: boolean;
}

/**
 * Initial State.
 * All inputs start as false (not pressed).
 */
const defaultInput: KeyboardInput = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    jump: false,
    crouch: false,
};

/**
 * Key Mapping Configuration.
 * Maps physical key codes (e.code) to logical actions.
 * * We use 'e.code' (Physical Location) instead of 'e.key' (Character) because:
 * 1. It works consistently regardless of language layout (WASD vs ZQSD).
 * 2. It avoids issues with capitalization (w vs W).
 */
const KEY_MAP: Record<string, keyof KeyboardInput> = {
    // Movement (Standard WASD)
    KeyW: 'forward',
    KeyS: 'backward',
    KeyA: 'left',
    KeyD: 'right',

    // Movement (Arrow Keys backup)
    ArrowUp: 'forward',
    ArrowDown: 'backward',
    ArrowLeft: 'left',
    ArrowRight: 'right',

    // Modifiers
    ShiftLeft: 'run',
    ShiftRight: 'run',
    KeyC: 'crouch',

    // Actions
    Space: 'jump'
};

/**
 * High-Performance Input Hook.
 * * * DESIGN CHOICE: Ref vs State
 * We return a `MutableRefObject` instead of React State.
 * * * JUSTIFICATION:
 * 1. Performance: Updating React State 60 times a second (e.g., holding a key)
 * triggers 60 re-renders/diffs. This kills framerate.
 * 2. Polling: The Game Loop (useFrame) runs outside the React Render cycle.
 * It needs to "poll" the current input instantly. A Ref provides
 * synchronous access to the latest data without waiting for a render.
 * * @returns A Ref object containing the live state of all inputs.
 */
export const useKeyboard = () => {
    // 1. Create a persistent mutable object that survives re-renders.
    const input = useRef<KeyboardInput>({ ...defaultInput });

    useEffect(() => {
        // 2. Define Event Handlers

        const handleKeyDown = (e: KeyboardEvent) => {
            // Look up the action for this specific physical key
            const action = KEY_MAP[e.code];

            // If this key maps to a game action, set it to TRUE
            if (action) {
                input.current[action] = true;
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const action = KEY_MAP[e.code];

            // If this key maps to a game action, set it to FALSE
            if (action) {
                input.current[action] = false;
            }
        };

        // 3. Bind to Window
        // We bind to 'window' so inputs register even if the user clicks
        // a UI element (like a chat box) and the canvas loses strict focus.
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // 4. Cleanup
        // Essential to prevent duplicate listeners if the component remounts
        // (e.g. during Hot Module Reloading in development).
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []); // Empty dependency array = run only once on mount

    return input;
};
