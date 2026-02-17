import { createSignal } from 'solid-js';
import { AudioEngine } from './host';

const wasmUrl = '/daw_engine.wasm';

export const audioEngine = new AudioEngine();

/**
 * Global signal indicating if the WASM engine is fully loaded and ready.
 * UI components should use this to disable controls during loading.
 */
export const [isAudioReady, setIsAudioReady] = createSignal(false);

/**
 * Global signal for tracking any fatal errors during engine initialization.
 */
export const [audioLoadError, setAudioLoadError] = createSignal<string | null>(null);

/**
 * Initializes the Audio Engine.
 * This should be called in response to a user interaction (e.g., "Start" button)
 * to comply with browser Autoplay policies.
 */
export const initializeAudio = async () => {
    if (isAudioReady()) return;

    try {
        console.log('[AudioContext] Initializing...');

        // 1. Resume AudioContext (required by browsers)
        await audioEngine.resume();

        // 2. Initialize WASM and Worklet
        await audioEngine.init(wasmUrl);

        // 3. Mark as Ready
        setIsAudioReady(true);
        setAudioLoadError(null);
        console.log('[AudioContext] Engine Ready.');
    } catch (err) {
        console.error('[AudioContext] Initialization Failed:', err);
        setAudioLoadError(err instanceof Error ? err.message : String(err));
        setIsAudioReady(false);
    }
};

/**
 * Terminates the Audio Engine.
 */
export const terminateAudio = async () => {
    if (!isAudioReady()) return;

    try {
        console.log('[AudioContext] Terminating...');
        await audioEngine.terminate();
        setIsAudioReady(false);
        console.log('[AudioContext] Engine Terminated.');
    } catch (err) {
        console.error('[AudioContext] Termination Failed:', err);
    }
};
