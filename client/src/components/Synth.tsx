import { useState } from 'react';
import { useSynth } from '../hooks/useSynth';

/* -------------------------------------------------------------------------- */
/* TYPES & CONSTANTS                                                          */
/* -------------------------------------------------------------------------- */

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// 2-octave scale (24 semitones)
const DOUBLE_SCALE = [...NOTES, ...NOTES];

const THEME_CLASSES = {
    controlsContainer: 'flex items-center justify-between rounded-lg bg-surface-highlight border border-border-base p-2 transition-colors duration-300',
    button: 'rounded bg-surface px-2 py-1 text-xs font-bold shadow-sm text-text-main hover:bg-border-base border border-transparent hover:border-border-base transition-all cursor-pointer',
    textMain: 'min-w-[3rem] text-center font-mono text-sm font-bold text-text-main',
    textMuted: 'text-xs text-text-muted'
};

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function Synth() {
    const [toneType, setToneType] = useState<OscillatorType>('sine');
    const [octave, setOctave] = useState(3);
    const { playTone } = useSynth();

    const getFreq = (index: number) => {
        const baseNote = (octave + 1) * 12; // MIDI note calculation
        const midiNote = baseNote + index;
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    };

    const handleNoteClick = (index: number) => {
        playTone(getFreq(index), toneType);
    };

    const cycleWaveform = () => {
        const types: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];
        const nextIndex = (types.indexOf(toneType) + 1) % types.length;
        setToneType(types[nextIndex]);
    };

    return (
        <div className='flex h-full flex-col gap-4'>

            {/* Controls UI */ }
            <div className={ THEME_CLASSES.controlsContainer }>
                <div className='flex items-center gap-2'>
                    <button
                        onClick={ () => setOctave(o => Math.max(1, o - 1)) }
                        className={ THEME_CLASSES.button }
                    >
                        - Oct
                    </button>

                    <span className={ THEME_CLASSES.textMain }>
                        C{ octave }
                    </span>

                    <button
                        onClick={ () => setOctave(o => Math.min(6, o + 1)) }
                        className={ THEME_CLASSES.button }
                    >
                        + Oct
                    </button>
                </div>
                <div>
                    <button onClick={ cycleWaveform } className={ THEME_CLASSES.button }>
                        { toneType }
                    </button>
                </div>
            </div>

            {/* Piano Roll UI */ }
            <div className='flex justify-center w-full'>
                <div
                    className='relative flex select-none overflow-x-auto overflow-y-hidden rounded-md bg-zinc-400 ring-1 ring-border-base w-fit max-w-full dark:bg-zinc-950'>
                    { DOUBLE_SCALE.map((note, i) => {
                        // Skip rendering sharp notes directly; they are physically attached to the previous natural note
                        if (note.includes('#')) return null;

                        // Check if the NEXT note is a sharp relative to this one
                        const nextNote = DOUBLE_SCALE[i + 1];
                        const hasSharp = nextNote && nextNote.includes('#');

                        const isFirst = i === 0;
                        const isLast = i === (NOTES.length * 2) - 1; // Last natural note roughly

                        return (
                            <div
                                key={ `${ note }-${ i }` }
                                // Z-Index Stack: Earlier keys (C) render ON TOP of later keys (D).
                                // This ensures the black key attached to C sits above D's border.
                                style={ { zIndex: DOUBLE_SCALE.length - i } }
                                className={ `relative flex w-14 h-48 shrink-0 flex-col border-t ${ isFirst ? 'border-l' : '' } ${ isLast ? 'border-r' : '' }` }
                            >
                                {/* White Key */ }
                                <button
                                    onMouseDown={ () => handleNoteClick(i) }
                                    // Use the new theme classes which now have opaque backgrounds
                                    className='h-full w-full rounded-b-sm transition-colors duration-200 cursor-pointer border bg-key-white-bg border-key-white-border active:bg-key-white-active hover:opacity-90'
                                />

                                {/* Black Key Overlay */ }
                                { hasSharp && (
                                    <button
                                        onMouseDown={ (e) => {
                                            e.stopPropagation();
                                            handleNoteClick(i + 1);
                                        } }
                                        style={ { width: '60%' } }
                                        // Use the new theme classes (bg-key-black-bg is now solid)
                                        className='absolute left-full top-0 z-10 -translate-x-1/2 h-3/5 rounded-b-sm shadow-md transition-colors duration-200 cursor-pointer border bg-key-black-bg border-key-black-border active:bg-key-black-active'
                                    />
                                ) }
                            </div>
                        );
                    }) }
                </div>
            </div>
        </div>
    );
}
