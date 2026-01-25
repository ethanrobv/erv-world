import { type Component, For, Show } from 'solid-js';
import { project } from '../../store/project';
import { PLUGIN_REGISTRY } from '../../core/audio/plugins';
import type { Track } from '../../store/types';
import { Knob } from './Knob';
import { OptionSelector } from './OptionSelector';

interface DeviceRackProps {
    /** Callback to update the project store when a parameter is changed. */
    onParamChange: (channel: number, id: number, val: number) => void;
}

/**
 * The main device panel.
 * Dynamically renders controls based on the active track's plugin definition.
 * Displays track info sidebar and a horizontal scrollable list of control sections.
 */
export const DeviceRack: Component<DeviceRackProps> = (props) => {
    const track = () => project.tracks.find((t) => t.id === project.selectedTrackId);

    const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
            const el = e.currentTarget as HTMLDivElement;
            if (el.scrollWidth > el.clientWidth) {
                e.preventDefault();
                // noinspection JSSuspiciousNameCombination
                el.scrollLeft += e.deltaY;
            }
        }
    };

    /**
     * Resolves the current value for a control definition.
     * Handles the "split state" where Volume/Pan are stored on the Track object,
     * while other parameters are stored in the Instrument object.
     */
    const getControlValue = (track: Track, paramId: number, defaultVal: number): number => {
        // ID 99 = Volume, ID 98 = Pan
        if (paramId === 99) return track.volume;
        if (paramId === 98) return track.pan;

        // Standard Plugin Params
        return track.instrument.params[paramId] ?? defaultVal ?? 0;
    };

    return (
        <Show
            when={track()}
            fallback={
                <div class="h-full flex items-center justify-center bg-bg-base text-[#444]">
                    <div class="flex flex-col items-center gap-2">
                        <div class="w-12 h-1 border-t-2 border-[#222]"></div>
                        <span class="text-xs font-bold tracking-[0.2em] uppercase">No Track Selected</span>
                        <div class="w-12 h-1 border-t-2 border-[#222]"></div>
                    </div>
                </div>
            }
        >
            {(activeTrack) => {
                const ch = () => activeTrack().channelIndex;
                const pluginDef = PLUGIN_REGISTRY[activeTrack().instrument.type];
                const sections = pluginDef?.ui || [];

                return (
                    <div class="h-full bg-bg-base text-gray-200 flex overflow-hidden">
                        {/* Track Info Sidebar */}
                        <div class="w-48 bg-[#0f0f0f] border-r border-[#1a1a1a] flex flex-col shrink-0">
                            <div class="p-4 border-b border-[#1a1a1a] bg-linear-to-b from-[#141414] to-[#0f0f0f]">
                                <h3 class="font-black text-white truncate text-sm tracking-wide leading-tight">
                                    {activeTrack().name}
                                </h3>
                                <div class="flex items-center gap-2 mt-1">
                                    <div class="h-px flex-1 bg-[#333]"></div>
                                    <span class="text-[10px] text-[#666] font-bold font-mono">
                                        CH.{String(ch() + 1).padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                            <div class="flex-1 p-4 flex flex-col gap-4">
                                <div class="p-3 bg-[#080808] border border-[#222] rounded">
                                    <div class="text-[9px] text-[#555] font-bold uppercase tracking-wider mb-1">
                                        Plugin
                                    </div>
                                    <div class="text-xs font-bold text-blue-400 flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        {activeTrack().instrument.name}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Device Chain Scroll Area */}
                        <div
                            class="flex-1 p-6 flex items-start gap-4 overflow-x-auto select-none"
                            onWheel={handleWheel}
                        >
                            <For each={sections}>
                                {(section) => (
                                    <div class="bg-[#181818] border border-[#2a2a2a] rounded shadow-xl flex flex-col shrink-0 group min-w-32 h-40">
                                        <div class="h-8 bg-[#1f1f1f] border-b border-[#2a2a2a] flex items-center justify-center rounded-t">
                                            <span class="text-[10px] font-bold text-[#666] group-hover:text-[#888] transition-colors uppercase tracking-widest">
                                                {section.title}
                                            </span>
                                        </div>

                                        <div class="flex-1 p-4 flex items-center justify-center gap-4">
                                            <For each={section.controls}>
                                                {(ctrl) => (
                                                    <Show
                                                        when={ctrl.type === 'waveform'}
                                                        fallback={
                                                            <Knob
                                                                label={ctrl.label}
                                                                min={ctrl.min ?? 0}
                                                                max={ctrl.max ?? 1}
                                                                value={getControlValue(
                                                                    activeTrack(),
                                                                    ctrl.paramId,
                                                                    pluginDef.defaults[ctrl.paramId]
                                                                )}
                                                                onChange={(v) =>
                                                                    props.onParamChange(ch(), ctrl.paramId, v)
                                                                }
                                                                color={ctrl.color}
                                                            />
                                                        }
                                                    >
                                                        <OptionSelector
                                                            def={ctrl}
                                                            value={getControlValue(
                                                                activeTrack(),
                                                                ctrl.paramId,
                                                                pluginDef.defaults[ctrl.paramId]
                                                            )}
                                                            onChange={(v) => props.onParamChange(ch(), ctrl.paramId, v)}
                                                        />
                                                    </Show>
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                );
            }}
        </Show>
    );
};
