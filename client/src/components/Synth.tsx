import { useState } from 'react';
import { useSynth } from '../hooks/useSynth';

// CSS variable classes
const themeClasses = {
    controlsContainer: 'flex items-center justify-between rounded-lg bg-surface-highlight border border-border-base p-2 transition-colors duration-300',
    button: 'rounded bg-surface px-2 py-1 text-xs font-bold shadow-sm text-text-main hover:bg-border-base border border-transparent hover:border-border-base transition-all cursor-pointer',
    textMain: 'min-w-[3rem] text-center font-mono text-sm font-bold text-text-main',
    textMuted: 'text-xs text-text-muted'
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// 2-octave scale (24 semitones)
const DOUBLE_SCALE = [...NOTES, ...NOTES];

export default function Synth() {
    const [toneType, setToneType] = useState<OscillatorType>('sine');
    const { playTone } = useSynth();
    const [octave, setOctave] = useState(3);

    const getFreq = (index: number) => {
        const baseNote = (octave + 1) * 12;
        const midiNote = baseNote + index;
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    };

    const handleNoteClick = (index: number) => {
        playTone(getFreq(index), toneType);
    };

    return (
        <div className="flex h-full flex-col gap-4">

            {/* Controls */ }
            <div className={ themeClasses.controlsContainer }>
                <div className="flex items-center gap-2">
                    <button onClick={ () => setOctave(o => Math.max(1, o - 1)) } className={ themeClasses.button }>
                        - Oct
                    </button>

                    <span className={ themeClasses.textMain }>
                        C{ octave }
                    </span>

                    <button onClick={ () => setOctave(o => Math.min(6, o + 1)) } className={ themeClasses.button }>
                        + Oct
                    </button>
                </div>
                <div>
                    <button onClick={ () => {
                        const types: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];
                        const nextIndex = (types.indexOf(toneType) + 1) % types.length;
                        setToneType(types[nextIndex]);
                    } } className={ themeClasses.button }>
                        { toneType }
                    </button>
                </div>
            </div>

            {/* Keys Container Wrapper - Centers the piano if screen is wide enough */ }
            <div className="flex justify-center w-full">
                <div
                    className="relative flex select-none overflow-x-auto overflow-y-hidden rounded-md bg-zinc-400 ring-1 ring-border-base w-fit max-w-full in-[.dark]:bg-zinc-950">
                    { DOUBLE_SCALE.map((note, i) => {
                        if (note.includes('#')) return null;

                        const nextNote = DOUBLE_SCALE[i + 1];
                        const hasSharp = nextNote && nextNote.includes('#');

                        return (
                            <div
                                key={ `${ note }-${ i }` }
                                className={ `relative flex w-14 h-48 shrink-0 flex-col border-t-3 ${ i == 0  ? 'border-l-3' : '' } ${ i == (NOTES.length * 2) - 1  ? 'border-r-3' : '' }` }
                            >
                                {/* WHITE KEY */ }
                                <button
                                    onMouseDown={ () => handleNoteClick(i) }
                                    className={ `
                                        h-full w-full rounded-b-xs transition-colors duration-200 cursor-pointer
                                        
                                        /* Base (Light Theme): Ivory */
                                        bg-[#FFFFF0] hover:bg-white active:bg-[#F0F0E0]
                                        border-black border

                                        /* Dark Theme Override */
                                        in-[.dark]:bg-zinc-800 
                                        in-[.dark]:hover:bg-zinc-700 
                                        in-[.dark]:active:bg-zinc-900
                                        in-[.dark]:border-zinc-600

                                        /* High Contrast Override */
                                        [*[data-theme=contrast]_&]:bg-black
                                        [*[data-theme=contrast]_&]:border
                                        [*[data-theme=contrast]_&]:border-white
                                        [*[data-theme=contrast]_&]:active:bg-zinc-900
                                    ` }
                                />

                                {/* BLACK KEY */ }
                                { hasSharp && (
                                    <button
                                        onMouseDown={ (e) => {
                                            e.stopPropagation();
                                            handleNoteClick(i + 1);
                                        } }
                                        className={ `
                                            absolute left-full top-0 z-10 -translate-x-1/2 h-3/5 w-2/3 rounded-b-xs shadow-md
                                            transition-colors duration-200 cursor-pointer
                                            
                                            /* Base (Light Theme): Ebony */
                                            bg-zinc-800 active:bg-zinc-700
                                            border-black border
                                            
                                            /* Dark Theme Override */
                                            in-[.dark]:bg-black 
                                            in-[.dark]:active:bg-zinc-900
                                            in-[.dark]:border in-[.dark]:border-zinc-600

                                            /* High Contrast Override */
                                            [*[data-theme=contrast]_&]:bg-cyan-400
                                            [*[data-theme=contrast]_&]:border-2 
                                            [*[data-theme=contrast]_&]:border-white
                                            [*[data-theme=contrast]_&]:active:bg-white
                                        ` }
                                        style={ { width: '60%' } }
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
