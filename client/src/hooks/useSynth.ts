import { useRef, useEffect } from 'react';

/**
 * Extends the Window interface to include webkitAudioContext for legacy Safari support.
 */
interface WindowWithWebkitAudio extends Window {
    webkitAudioContext?: typeof AudioContext;
}

/**
 * A custom hook for simple synthesizer playback using the Web Audio API.
 * Manages the AudioContext lifecycle and provides a function to play tones.
 */
export const useSynth = () => {
    /**
     * Reference to the AudioContext.
     * Initialized lazily inside useEffect to ensure it runs only on the client side.
     */
    const audioCtx = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext
        // Cast window to our extended interface to safely check for webkitAudioContext
        const AudioContextClass = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;

        if (AudioContextClass) {
            audioCtx.current = new AudioContextClass();
        } else {
            console.warn('Web Audio API is not supported in this browser.');
        }

        // Cleanup on unmount
        return () => {
            // Close the context to prevent memory leaks and hardware locks
            if (audioCtx.current && audioCtx.current.state !== 'closed') {
                audioCtx.current.close().catch((err) => console.error('Error closing AudioContext:', err));
            }
        };
    }, []);

    /**
     * Plays a single tone with a simple AD (Attack-Decay) envelope.
     *
     * @param freq - The frequency of the note in Hertz (Hz).
     * @param type - The waveform shape (e.g., 'sine', 'square', 'sawtooth', 'triangle').
     */
    const playTone = (freq: number, type: OscillatorType) => {
        // Ensure context exists
        if (!audioCtx.current) return;

        // Resume context if suspended (browser autoplay policy often requires this after user interaction)
        if (audioCtx.current.state === 'suspended') {
            void audioCtx.current.resume();
        }

        const ctx = audioCtx.current;

        // 1. Create Oscillator (Source)
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // 2. Create Gain Node (Volume Envelope)
        const gain = ctx.createGain();

        // 3. Connect Graph: Oscillator -> Gain -> Destination (Speakers)
        // This establishes the audio signal path.
        osc.connect(gain);
        gain.connect(ctx.destination);


        // 4. Envelope Settings (AD - Attack/Decay)
        const attackTime = 0.05;
        const decayTime = 1;
        const peakGain = 0.3;

        // Initial silence
        gain.gain.setValueAtTime(0, ctx.currentTime);

        // Attack: Ramp up to peak volume
        gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + attackTime);

        // Decay: Ramp down to near-silence
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + decayTime);


        // 5. Trigger
        osc.start();

        // Stop oscillator slightly after decay finishes to ensure complete silence
        // Prevents "pop" sounds or lingering silent oscillators consuming CPU
        osc.stop(ctx.currentTime + decayTime + 0.1);

        // Garbage collection optimization: disconnect nodes after they are done
        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };
    };

    return { playTone };
};
