import { createStore } from 'solid-js/store';

/**
 * Represents the state and geometry of a draggable UI window.
 * Uses a normalized coordinate system (0.0 to 1.0) for position and size to ensure responsiveness.
 * Constraints (minWidth, minHeight) are defined in pixels.
 */
export interface WindowState {
    /** Unique identifier for the window. */
    id: string;
    /** Text displayed in the window title bar. */
    title: string;
    /** Visibility state of the window. */
    isOpen: boolean;
    /** Prevents the window from being moved or resized by the user. */
    isPinned: boolean;
    /** Stack order of the window. */
    zIndex: number;
    /** Horizontal position as a percentage of the viewport width (0.0 - 1.0). */
    x: number;
    /** Vertical position as a percentage of the viewport height (0.0 - 1.0). */
    y: number;
    /** Width as a percentage of the viewport width (0.0 - 1.0). */
    width: number;
    /** Height as a percentage of the viewport height (0.0 - 1.0). */
    height: number;
    /** Minimum allowed width in pixels. */
    minWidth: number;
    /** Minimum allowed height in pixels. */
    minHeight: number;
}

/**
 * Creates a reactive window store and associated actions.
 * This allows different applications to have independent window managers.
 * @param defaults The initial set of windows for this manager.
 */
export function createWindowStore(defaults: Record<string, WindowState>) {
    const [store, setStore] = createStore<Record<string, WindowState>>(defaults);

    let globalMaxZ = 50;

    const actions = {
        open: (id: string) => {
            setStore(id, { isOpen: true, zIndex: ++globalMaxZ });
        },

        close: (id: string) => {
            setStore(id, 'isOpen', false);
        },

        togglePin: (id: string) => {
            setStore(id, 'isPinned', (pinned) => !pinned);
        },

        focus: (id: string) => {
            const win = store[id];
            if (win && win.zIndex !== globalMaxZ) {
                setStore(id, 'zIndex', ++globalMaxZ);
            }
        },

        /**
         * Updates the position of a window.
         * @param id The window ID.
         * @param x Normalized X position (0.0 - 1.0).
         * @param y Normalized Y position (0.0 - 1.0).
         */
        move: (id: string, x: number, y: number) => {
            if (!store[id]?.isPinned) {
                setStore(id, { x, y });
            }
        },

        /**
         * Updates the dimensions of a window.
         * @param id The window ID.
         * @param width Normalized Width (0.0 - 1.0).
         * @param height Normalized Height (0.0 - 1.0).
         */
        resize: (id: string, width: number, height: number) => {
            if (!store[id]?.isPinned) {
                setStore(id, { width, height });
            }
        },

        toggle: (id: string) => {
            if (store[id]?.isOpen) {
                actions.close(id);
            } else {
                actions.open(id);
            }
        },
    };

    return { windowStore: store, WindowActions: actions };
}
