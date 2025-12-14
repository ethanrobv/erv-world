import { useRef, useEffect } from 'react';

export const useSynth = () => {
    const audioCtx = useRef<AudioContext | null>(null);

    useEffect(() => {
        // Initialize AudioContext on first interaction or mount
        audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        return () => {
            audioCtx.current?.close();
        };
    }, []);

    const playTone = (freq: number, tone: OscillatorType) => {
        if (!audioCtx.current) return;
        const ctx = audioCtx.current;

        // 1. Create Oscillator (Source)
        const osc = ctx.createOscillator();
        osc.type = tone; // Options: 'sine', 'square', 'sawtooth', 'triangle'
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // 2. Create Gain Node (Volume/Envelope)
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1); // Decay

        // 3. Connect: Osc -> Gain -> Speakers
        osc.connect(gain);
        gain.connect(ctx.destination);

        // 4. Start and Stop
        osc.start();
        osc.stop(ctx.currentTime + 1); // Stop after 1 second
    };

    return { playTone };
};
