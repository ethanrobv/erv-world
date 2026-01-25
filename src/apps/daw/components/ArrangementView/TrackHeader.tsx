import { type Component } from 'solid-js';
import { ProjectActions } from '../../store/project';
import type { Track } from '../../store/types';

interface TrackHeaderProps {
    track: Track;
    isSelected: boolean;
    onDelete: () => void;
}

/**
 * Renders the header control for a single track in the arrangement sidebar.
 * Includes Mute/Solo controls and track selection.
 */
export const TrackHeader: Component<TrackHeaderProps> = (props) => {
    return (
        <div
            class={`h-full flex items-center bg-[#1a1a1a] hover:bg-[#222] transition-colors select-none relative group ${
                props.isSelected ? 'bg-[#222]' : ''
            }`}
            onClick={() => ProjectActions.selectTrack(props.track.id)}
        >
            <div class="absolute left-0 top-0 bottom-0 w-1" style={{ 'background-color': props.track.color }}></div>

            <div class="pl-4">
                <button
                    class="text-[#444] hover:text-red-500 font-bold px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        props.onDelete();
                    }}
                    title="Delete Track"
                >
                    Delete
                </button>
            </div>
            <div class="px-3 w-full pl-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-sm truncate text-neutral-300">{props.track.name}</span>
                </div>
                <div class="flex gap-2">
                    <button
                        class={`text-xs w-6 h-6 rounded-sm border flex items-center justify-center font-bold transition-colors ${
                            props.track.isMuted
                                ? 'bg-red-900 border-red-700 text-white'
                                : 'bg-[#222] border-[#333] text-neutral-500 hover:text-neutral-300'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            ProjectActions.updateTrackParam(props.track.id, 'isMuted', !props.track.isMuted);
                        }}
                    >
                        M
                    </button>
                    <button
                        class={`text-xs w-6 h-6 rounded-sm border flex items-center justify-center font-bold transition-colors ${
                            props.track.isSoloed
                                ? 'bg-yellow-700 border-yellow-600 text-white'
                                : 'bg-[#222] border-[#333] text-neutral-500 hover:text-neutral-300'
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            ProjectActions.updateTrackParam(props.track.id, 'isSoloed', !props.track.isSoloed);
                        }}
                    >
                        S
                    </button>
                </div>
            </div>
        </div>
    );
};
