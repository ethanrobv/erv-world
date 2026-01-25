import { For, type Component } from 'solid-js';
import type { Clip } from '../../store/types';

interface ClipItemProps {
    clip: Clip;
    trackId: string;
    pxPerBeat: number;
    isSelected: boolean;
    onMouseDown: (e: MouseEvent) => void;
    onDoubleClick: (e: MouseEvent) => void;
}

/**
 * Visual representation of a clip on the timeline.
 * Renders a note preview and handles drag/resize interactions.
 */
export const ClipItem: Component<ClipItemProps> = (props) => {
    const getStyle = () => ({
        left: `${props.clip.start * props.pxPerBeat}px`,
        width: `${props.clip.length * props.pxPerBeat}px`,
    });

    const getClass = () =>
        `absolute top-1 bottom-1 rounded border overflow-hidden z-10 select-none group ${
            props.isSelected
                ? 'bg-blue-900/80 border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,0.5)]'
                : 'bg-neutral-700/80 border-neutral-600 hover:border-neutral-500 hover:bg-neutral-600/90'
        }`;

    const getHeaderClass = () =>
        `h-4 px-1.5 text-[10px] font-bold truncate flex items-center pointer-events-none mb-0.5 ${
            props.isSelected ? 'bg-blue-600 text-white' : 'bg-black/30 text-neutral-300'
        }`;

    return (
        <div class={getClass()} style={getStyle()} onMouseDown={props.onMouseDown} onDblClick={props.onDoubleClick}>
            <div class={getHeaderClass()}>{props.clip.name}</div>

            <div class="absolute inset-0 top-4 pointer-events-none">
                <For each={props.clip.notes}>
                    {(note) => {
                        const relativePitch = Math.min(127, Math.max(0, note.midi)) / 127;

                        return (
                            <div
                                class="absolute bg-white/90 rounded-[1px] shadow-sm"
                                style={{
                                    left: `${(note.start / props.clip.length) * 100}%`,
                                    width: `${(note.duration / props.clip.length) * 100}%`,
                                    bottom: `${relativePitch * 80 + 10}%`,
                                    height: '3px',
                                    'min-width': '1px',
                                }}
                            />
                        );
                    }}
                </For>
            </div>

            <div class="resize-w absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/10 transition-colors z-20" />
            <div class="resize-e absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/10 transition-colors z-20" />
        </div>
    );
};
