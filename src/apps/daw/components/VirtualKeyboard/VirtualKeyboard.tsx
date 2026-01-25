import { type Component, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { ProjectActions } from '../../store/project';
import {
    activeInputNotes,
    BASE_OCTAVE,
    InputManager,
    inputOctave,
    inputVelocity,
    isQwertyEnabled,
    keyboardBaseMidi,
    setInputOctave,
    setInputVelocity,
    setIsQwertyEnabled,
} from '../../core/audio/input-manager';
import { MidiSettings } from './MidiSettings';

const WHITE_KEY_WIDTH_PX = 56;

interface PianoKeyProps {
    index: number;
    isLast: boolean;
    labelWhite: string | null;
    labelBlack: string | null;
    onNoteStart: (midi: number) => void;
    onNoteStop: (midi: number) => void;
}

/**
 * Individual Piano Key component.
 * Calculates its own MIDI note reactively based on global keyboard state and local index.
 */
const PianoKey: Component<PianoKeyProps> = (props) => {
    const noteIndex = props.index % 7;
    const octaveIndex = Math.floor(props.index / 7);
    const chromaticOffset = [0, 2, 4, 5, 7, 9, 11][noteIndex] ?? 0;
    const hasBlackKey = [0, 1, 3, 4, 5].includes(noteIndex);

    const getMidiWhite = () => {
        return keyboardBaseMidi() + octaveIndex * 12 + chromaticOffset;
    };

    const getMidiBlack = () => getMidiWhite() + 1;

    const noteName = () => {
        if (noteIndex !== 0) return '';
        const octave = Math.floor(getMidiWhite() / 12) - 1;
        return `C${octave}`;
    };

    const isWhiteActive = () => activeInputNotes().has(getMidiWhite());
    const isBlackActive = () => activeInputNotes().has(getMidiBlack());

    return (
        <div class="relative h-full select-none">
            <div
                class={`w-14 h-full border-x border-b border-[#888] rounded-b-sm relative transition-colors duration-75 origin-top
                    ${
                        isWhiteActive()
                            ? 'bg-neutral-300 shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]'
                            : 'bg-white shadow-[inset_0_-8px_10px_rgba(0,0,0,0.05)] hover:bg-[#fafafa]'
                    }
                `}
                onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    props.onNoteStart(getMidiWhite());
                }}
                onMouseUp={() => props.onNoteStop(getMidiWhite())}
                onMouseLeave={() => props.onNoteStop(getMidiWhite())}
            >
                <Show when={props.labelWhite}>
                    <div class="absolute bottom-4 left-0 right-0 flex justify-center z-10 pointer-events-none">
                        <span class="text-xs font-bold text-neutral-500 font-mono">{props.labelWhite}</span>
                    </div>
                </Show>

                <span class="absolute bottom-10 left-0 right-0 text-center text-[10px] font-bold text-neutral-300 pointer-events-none">
                    {noteName()}
                </span>
            </div>

            <Show when={hasBlackKey && !props.isLast}>
                <div
                    class={`absolute top-0 -right-4 w-8 h-[62%] border-x border-b border-black rounded-b-xs z-50 cursor-pointer origin-top transition-[transform,box-shadow] duration-75
                        ${
                            isBlackActive()
                                ? 'bg-[#222] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] translate-y-0.5'
                                : 'bg-linear-to-b from-[#1a1a1a] to-black shadow-[2px_4px_6px_rgba(0,0,0,0.4)]'
                        }
                    `}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        if (e.button !== 0) return;
                        props.onNoteStart(getMidiBlack());
                    }}
                    onMouseUp={(e) => {
                        e.stopPropagation();
                        props.onNoteStop(getMidiBlack());
                    }}
                    onMouseLeave={(e) => {
                        e.stopPropagation();
                        props.onNoteStop(getMidiBlack());
                    }}
                >
                    <Show when={props.labelBlack}>
                        <div class="absolute bottom-3 left-0 right-0 flex justify-center z-50 pointer-events-none">
                            <span class="text-[10px] font-bold text-neutral-400 font-mono">{props.labelBlack}</span>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
};

/**
 * Virtual Keyboard container.
 * Manages the resizing of keys and delegates inputs to the ProjectActions.
 */
export const VirtualKeyboard: Component = () => {
    const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
    const [keyCount, setKeyCount] = createSignal(14);
    const [mouseActiveNotes, setMouseActiveNotes] = createSignal<Set<number>>(new Set());

    onMount(() => {
        const el = containerRef();
        if (!el) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width - 40;
                const count = Math.floor(width / WHITE_KEY_WIDTH_PX);
                setKeyCount(Math.max(7, count));
            }
        });

        observer.observe(el);
        onCleanup(() => observer.disconnect());
    });

    const handleNoteStart = (midi: number) => {
        if (midi < 0 || midi > 127) return;
        const current = new Set(mouseActiveNotes());
        current.add(midi);
        setMouseActiveNotes(current);

        ProjectActions.handleMidiEvent(midi, inputVelocity(), 'noteOn');
    };

    const handleNoteStop = (midi: number) => {
        if (midi < 0 || midi > 127) return;
        const current = new Set(mouseActiveNotes());
        if (current.has(midi)) {
            current.delete(midi);
            setMouseActiveNotes(current);
            ProjectActions.handleMidiEvent(midi, 0, 'noteOff');
        }
    };

    const handleToolbarWheel = (e: WheelEvent) => {
        if (e.deltaX !== 0) return;
        const el = e.currentTarget as HTMLElement;
        if (el.scrollWidth > el.clientWidth) {
            e.preventDefault();
            // noinspection JSSuspiciousNameCombination
            el.scrollLeft += e.deltaY;
        }
    };

    const getLabel = (visualIndex: number, isBlack: boolean) => {
        if (!isQwertyEnabled()) return null;
        const noteIndex = visualIndex % 7;
        const octaveIndex = Math.floor(visualIndex / 7);
        const chromaticBase = [0, 2, 4, 5, 7, 9, 11][noteIndex] ?? 0;
        let totalOffset = octaveIndex * 12 + chromaticBase;

        if (isBlack) totalOffset += 1;

        return InputManager.NoteToKeyLabel[totalOffset] || null;
    };

    return (
        <div class="h-full flex flex-col bg-[#141414] border-t border-[#1a1a1a] select-none">
            <style>
                {`
                    .custom-scrollbar::-webkit-scrollbar { height: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: #111; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
                `}
            </style>

            <div
                class="h-16 shrink-0 bg-[#111] border-b border-[#222] flex items-center px-6 gap-8 overflow-x-auto custom-scrollbar z-20 whitespace-nowrap"
                onWheel={handleToolbarWheel}
            >
                <button
                    class={`flex items-center gap-3 px-4 h-9 rounded bg-[#1a1a1a] border transition-all duration-200 group shrink-0 ${
                        isQwertyEnabled()
                            ? 'border-blue-500/40 shadow-[0_0_8px_rgba(59,130,246,0.15)]'
                            : 'border-[#333] hover:border-[#555]'
                    }`}
                    onClick={() => setIsQwertyEnabled(!isQwertyEnabled())}
                >
                    <div
                        class={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${isQwertyEnabled() ? 'bg-blue-500' : 'bg-neutral-700'}`}
                    ></div>
                    <span
                        class={`text-xs font-bold tracking-widest ${isQwertyEnabled() ? 'text-blue-100' : 'text-neutral-500'}`}
                    >
                        QWERTY
                    </span>
                </button>

                <div class="flex items-center bg-[#1a1a1a] rounded border border-[#333] h-9 p-0.5 shrink-0">
                    <span class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider px-3 border-r border-[#333] h-full flex items-center">
                        Octave
                    </span>
                    <button
                        class="w-9 h-full flex items-center justify-center hover:bg-[#2a2a2a] active:bg-black text-neutral-400 hover:text-white text-sm font-bold transition-colors rounded-l-sm"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setInputOctave((s) => Math.max(-2, s - 1));
                        }}
                    >
                        -
                    </button>
                    <div class="w-10 h-full flex items-center justify-center text-xs font-mono font-bold text-blue-400 bg-black/40">
                        {BASE_OCTAVE + inputOctave() - 1}
                    </div>
                    <button
                        class="w-9 h-full flex items-center justify-center hover:bg-[#2a2a2a] active:bg-black text-neutral-400 hover:text-white text-sm font-bold transition-colors rounded-r-sm"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setInputOctave((s) => Math.min(4, s + 1));
                        }}
                    >
                        +
                    </button>
                </div>

                <div class="flex items-center bg-[#1a1a1a] rounded border border-[#333] h-9 px-4 gap-4 shrink-0">
                    <span class="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Velocity</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={inputVelocity()}
                        onInput={(e) => setInputVelocity(Number(e.currentTarget.value))}
                        class="w-32 h-1.5 bg-[#0a0a0a] rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500"
                    />
                    <span class="text-xs font-mono font-bold w-8 text-right text-blue-400">
                        {Math.round(inputVelocity() * 100)}
                    </span>
                </div>

                <div class="ml-auto shrink-0">
                    <MidiSettings />
                </div>
            </div>

            <div
                ref={setContainerRef}
                class="flex-1 bg-[#0a0a0a] overflow-hidden relative flex items-start justify-center pt-2"
            >
                <div class="absolute top-0 left-0 right-0 h-1.5 bg-[#a31616] shadow-[0_2px_5px_rgba(0,0,0,0.5)] z-0"></div>
                <div class="absolute top-2 bottom-4 left-4 right-4 bg-black/50 blur-xl"></div>

                <div class="flex relative h-[94%] z-10">
                    <For each={Array.from({ length: keyCount() })}>
                        {(_, index) => (
                            <PianoKey
                                index={index()}
                                isLast={index() === keyCount() - 1}
                                labelWhite={getLabel(index(), false)}
                                labelBlack={getLabel(index(), true)}
                                onNoteStart={handleNoteStart}
                                onNoteStop={handleNoteStop}
                            />
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
};
