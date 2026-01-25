import { For, createSignal, type Component, Show, createMemo, createEffect, onCleanup, onMount } from 'solid-js';
import { project, ProjectActions, setProject } from '../../store/project';
import { WindowActions } from '../../store/window-manager';
import { audioEngine } from '../../core/audio/audio-context';

interface Props {
    clipId: string | null;
}

const NOTE_HEIGHT = 24;
const PX_PER_BEAT = 80;
const MIN_NOTE = 36;
const MAX_NOTE = 84;
const NOTE_RANGE = MAX_NOTE - MIN_NOTE + 1;
const RESIZE_HANDLE_WIDTH = 12;

/**
 * Pure helper to calculate selection rectangle geometry.
 */
const getSelectionRect = (originX: number, originY: number, currentX: number, currentY: number) => ({
    x: Math.min(originX, currentX),
    y: Math.min(originY, currentY),
    w: Math.abs(currentX - originX),
    h: Math.abs(currentY - originY),
});

/**
 * Piano Roll editor for MIDI note manipulation.
 * Features:
 * - Reactive multi-selection visualization
 * - Group moving and resizing
 * - Grid snapping
 * - Copy/Paste/Delete operations
 * - Synchronized scrolling
 * - Auto-closes only if the selected clip is deleted or explicitly deselected.
 */
export const PianoRoll: Component<Props> = (props) => {
    const [keysRef, setKeysRef] = createSignal<HTMLDivElement>();
    const [gridRef, setGridRef] = createSignal<HTMLDivElement>();
    const [mainContainerRef, setMainContainerRef] = createSignal<HTMLDivElement>();

    const [activeNote, setActiveNote] = createSignal<number | null>(null);
    const [selectedNoteIds, setSelectedNoteIds] = createSignal<Set<string>>(new Set());
    const [isSelecting, setIsSelecting] = createSignal(false);
    const [selectionRect, setSelectionRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);

    /**
     * Manages lifecycle of the Piano Roll window.
     * Resets state when clip changes, and closes window if clip is removed.
     */
    createEffect(() => {
        const currentClipId = props.clipId;

        // Auto-close only if we have no clip ID to display
        if (!currentClipId) {
            WindowActions.close('pianoRoll');
            return;
        }

        // Clip exists, so we reset the internal editor state for the new clip context
        setSelectedNoteIds(new Set<string>());
        setActiveNote(null);
        setSelectionRect(null);
        setIsSelecting(false);

        // Auto-center the grid vertically
        const el = gridRef();
        if (el) {
            el.scrollTop = (NOTE_RANGE * NOTE_HEIGHT) / 2 - el.clientHeight / 2;
        }
    });

    const snapToGrid = (val: number): number => {
        if (!project.view.snapToGrid) return val;
        const grid = project.view.gridSize;
        return Math.round(val / grid) * grid;
    };

    const isBlackKey = (midi: number): boolean => {
        const n = midi % 12;
        return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
    };

    const getNoteLabel = (midi: number): string => {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        if (midi % 12 === 0) return `${notes[0]}${octave}`;
        return '';
    };

    const handleNoteOn = (midi: number) => {
        if (!props.clipId) return;
        const clip = project.clips[props.clipId];
        const track = project.tracks.find((t) => t.id === clip?.trackId);
        if (track) {
            audioEngine.triggerNote(track.channelIndex, midi, 0.8);
            setActiveNote(midi);
        }
    };

    const handleNoteOff = (midi: number) => {
        if (!props.clipId) return;
        const clip = project.clips[props.clipId];
        const track = project.tracks.find((t) => t.id === clip?.trackId);
        if (track) {
            audioEngine.stopNote(track.channelIndex, midi);
            setActiveNote(null);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!props.clipId) return;

        const container = mainContainerRef();
        if (!container || !container.contains(document.activeElement)) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.stopPropagation();
            const ids = selectedNoteIds();
            if (ids.size > 0) {
                setProject('clips', props.clipId, 'notes', (notes) => notes.filter((n) => !ids.has(n.id)));
                setSelectedNoteIds(new Set<string>());
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            e.stopPropagation();
            const ids = selectedNoteIds();
            const notes = project.clips[props.clipId].notes.filter((n) => ids.has(n.id));
            if (notes.length > 0) {
                ProjectActions.copy({ type: 'notes', data: JSON.parse(JSON.stringify(notes)) });
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            e.stopPropagation();
            ProjectActions.pasteNotes(props.clipId, project.transport.position);
        }
    };

    onMount(() => window.addEventListener('keydown', handleKeyDown));
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));

    const handleGridMouseDown = (e: MouseEvent) => {
        const el = gridRef();
        if (!el || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('.note-item')) return;

        if (!e.shiftKey && !e.ctrlKey) {
            setSelectedNoteIds(new Set<string>());
        }

        const rect = el.getBoundingClientRect();
        const originX = e.clientX - rect.left + el.scrollLeft;
        const originY = e.clientY - rect.top + el.scrollTop;

        setIsSelecting(true);
        setSelectionRect({ x: originX, y: originY, w: 0, h: 0 });

        const onMouseMove = (ev: MouseEvent) => {
            const currentX = ev.clientX - rect.left + el.scrollLeft;
            const currentY = ev.clientY - rect.top + el.scrollTop;

            const selection = getSelectionRect(originX, originY, currentX, currentY);
            setSelectionRect(selection);

            const notes = project.clips[props.clipId!]?.notes || [];
            const newSelection = new Set<string>(e.ctrlKey ? Array.from(selectedNoteIds()) : []);

            notes.forEach((note) => {
                const noteX = note.start * PX_PER_BEAT;
                const noteY = (MAX_NOTE - note.midi) * NOTE_HEIGHT;
                const noteW = Math.max(8, note.duration * PX_PER_BEAT);

                if (
                    selection.x < noteX + noteW &&
                    selection.x + selection.w > noteX &&
                    selection.y < noteY + NOTE_HEIGHT &&
                    selection.y + selection.h > noteY
                ) {
                    newSelection.add(note.id);
                }
            });
            setSelectedNoteIds(newSelection);
        };

        const onMouseUp = () => {
            setIsSelecting(false);
            setSelectionRect(null);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleGridDblClick = (e: MouseEvent) => {
        if (!props.clipId) return;
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const beat = snapToGrid(x / PX_PER_BEAT);
        const keyIndex = Math.floor(y / NOTE_HEIGHT);
        const midi = MAX_NOTE - keyIndex;
        ProjectActions.addNote(props.clipId, midi, beat, 1.0);
    };

    const handleNoteMouseDown = (e: MouseEvent, noteId: string) => {
        e.stopPropagation();
        if (!props.clipId) return;

        const currentSelected = new Set(selectedNoteIds());

        if (e.ctrlKey) {
            if (currentSelected.has(noteId)) currentSelected.delete(noteId);
            else currentSelected.add(noteId);
            setSelectedNoteIds(currentSelected);
            return;
        } else if (!currentSelected.has(noteId)) {
            currentSelected.clear();
            currentSelected.add(noteId);
            setSelectedNoteIds(currentSelected);
        }

        const startX = e.clientX;
        const startY = e.clientY;
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const clickX = e.clientX - rect.left;

        const isResizing = clickX > rect.width - RESIZE_HANDLE_WIDTH;

        const movingNotes = project.clips[props.clipId].notes.filter((n) => currentSelected.has(n.id));
        const initialStates = movingNotes.map((n) => ({ ...n }));

        const onMouseMove = (ev: MouseEvent) => {
            const pxDeltaX = ev.clientX - startX;
            const beatDeltaRaw = pxDeltaX / PX_PER_BEAT;

            setProject('clips', props.clipId!, 'notes', (notes) => {
                return notes.map((note) => {
                    const initialState = initialStates.find((s) => s.id === note.id);
                    if (!initialState) return note;

                    if (isResizing) {
                        const rawNewDuration = Math.max(0.125, initialState.duration + beatDeltaRaw);
                        const newDuration = snapToGrid(rawNewDuration);
                        return { ...note, duration: Math.max(0.125, newDuration) };
                    } else {
                        const pxDeltaY = ev.clientY - startY;
                        const pitchDelta = -Math.round(pxDeltaY / NOTE_HEIGHT);

                        const rawNewStart = initialState.start + beatDeltaRaw;
                        const newStart = Math.max(0, snapToGrid(rawNewStart));
                        const newMidi = Math.max(MIN_NOTE, Math.min(MAX_NOTE, initialState.midi + pitchDelta));

                        return { ...note, start: newStart, midi: newMidi };
                    }
                });
            });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const handleScroll = (e: Event) => {
        const target = e.target as HTMLDivElement;
        const kr = keysRef();
        if (kr) kr.scrollTop = target.scrollTop;
    };

    const rowData = createMemo(() => {
        return Array.from({ length: NOTE_RANGE }, (_, i) => ({
            midi: MAX_NOTE - i,
            isBlack: isBlackKey(MAX_NOTE - i),
            label: getNoteLabel(MAX_NOTE - i),
        }));
    });

    const getSelectionStyle = () => {
        const r = selectionRect();
        return r ? { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` } : {};
    };

    return (
        <div
            ref={setMainContainerRef}
            class="flex h-full bg-bg-base overflow-hidden border-t border-border-dim select-none outline-none"
            tabIndex={0}
        >
            {/* Keys Column */}
            <div
                ref={setKeysRef}
                class="w-16 shrink-0 overflow-hidden bg-[#181818] border-r border-[#333] relative z-20 shadow-xl no-scrollbar"
            >
                <div class="flex flex-col">
                    <For each={rowData()}>
                        {(row) => (
                            <div
                                class={`relative border-b border-[#333] box-border flex items-center justify-end pr-2 cursor-pointer transition-colors ${
                                    row.isBlack
                                        ? activeNote() === row.midi
                                            ? 'bg-blue-600'
                                            : 'bg-[#111] text-neutral-500'
                                        : activeNote() === row.midi
                                          ? 'bg-blue-400'
                                          : 'bg-[#f0f0f0] text-neutral-900'
                                }`}
                                style={{ height: `${NOTE_HEIGHT}px` }}
                                onMouseDown={() => handleNoteOn(row.midi)}
                                onMouseUp={() => handleNoteOff(row.midi)}
                                onMouseLeave={() => handleNoteOff(row.midi)}
                            >
                                <span class="text-[10px] font-black uppercase tracking-tighter">{row.label}</span>
                            </div>
                        )}
                    </For>
                </div>
            </div>

            {/* Note Grid */}
            <div
                ref={setGridRef}
                class="flex-1 relative overflow-auto bg-[#141414] scroll-smooth"
                onScroll={handleScroll}
                onMouseDown={handleGridMouseDown}
            >
                <Show when={props.clipId}>
                    <div
                        class="relative"
                        style={{
                            height: `${NOTE_RANGE * NOTE_HEIGHT}px`,
                            width: '5000px',
                            'background-image': 'linear-gradient(to right, #222 1px, transparent 1px)',
                            'background-size': `${PX_PER_BEAT * project.view.gridSize}px 100%`,
                        }}
                        onDblClick={handleGridDblClick}
                    >
                        {/* Grid Rows */}
                        <div class="absolute inset-0 pointer-events-none flex flex-col">
                            <For each={rowData()}>
                                {(row) => (
                                    <div
                                        class={`w-full border-b border-white/5 ${row.isBlack ? 'bg-black/30' : 'bg-transparent'}`}
                                        style={{ height: `${NOTE_HEIGHT}px` }}
                                    />
                                )}
                            </For>
                        </div>

                        {/* Selection Box */}
                        {isSelecting() && selectionRect() && (
                            <div
                                class="absolute bg-blue-500/10 border border-blue-400/50 z-50 pointer-events-none"
                                style={getSelectionStyle()}
                            ></div>
                        )}

                        {/* Notes */}
                        <For each={project.clips[props.clipId!]?.notes || []}>
                            {(note) => (
                                <div
                                    classList={{
                                        'note-item absolute rounded-sm shadow-sm z-10 transition-colors group': true,
                                        'bg-blue-400 border border-white shadow-[0_0_5px_rgba(255,255,255,0.5)]':
                                            selectedNoteIds().has(note.id),
                                        'bg-blue-600 border border-blue-500 hover:brightness-110':
                                            !selectedNoteIds().has(note.id),
                                    }}
                                    style={{
                                        left: `${note.start * PX_PER_BEAT}px`,
                                        top: `${(MAX_NOTE - note.midi) * NOTE_HEIGHT + 1}px`,
                                        width: `${Math.max(8, note.duration * PX_PER_BEAT - 1)}px`,
                                        height: `${NOTE_HEIGHT - 2}px`,
                                        cursor: 'move',
                                    }}
                                    onMouseDown={(e) => handleNoteMouseDown(e, note.id)}
                                >
                                    <div
                                        class="absolute top-0 right-0 bottom-0 cursor-e-resize hover:bg-white/20 z-20"
                                        style={{ width: `${RESIZE_HANDLE_WIDTH}px` }}
                                    ></div>

                                    <div
                                        class="absolute bottom-0 left-0 right-0 bg-black/30 pointer-events-none"
                                        style={{ height: `${(1 - note.velocity) * 100}%` }}
                                    />
                                </div>
                            )}
                        </For>

                        {/* Playhead */}
                        <div
                            class="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                            style={{ left: `${project.transport.position * PX_PER_BEAT}px` }}
                        />
                    </div>
                </Show>
            </div>
        </div>
    );
};
