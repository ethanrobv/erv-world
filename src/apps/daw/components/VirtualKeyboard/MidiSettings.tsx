import { type Component, For, Show } from 'solid-js';
import { connectedMidiDevices } from '../../core/audio/input-manager';

/**
 * Renders detected MIDI input devices with connectivity status.
 * Uses a horizontal layout with a fixed-width container to prevent
 * layout shifting in the parent toolbar when devices are added/removed.
 */
export const MidiSettings: Component = () => {
    return (
        <div class="flex items-center h-full border-l border-[#333] select-none shrink-0">
            <span class="pl-6 pr-4 text-[10px] font-bold text-[#555] uppercase tracking-wider shrink-0">
                MIDI Inputs
            </span>

            <div class="flex items-center gap-3 overflow-x-auto no-scrollbar w-64 py-2 mask-linear-fade">
                <Show
                    when={connectedMidiDevices().length > 0}
                    fallback={
                        <div class="flex items-center gap-2 h-8 border border-transparent opacity-40 select-none pointer-events-none">
                            <div class="w-2 h-2 rounded-full bg-neutral-500"></div>
                            <span class="text-xs font-medium text-neutral-500 italic whitespace-nowrap">
                                No devices detected
                            </span>
                        </div>
                    }
                >
                    <For each={connectedMidiDevices()}>
                        {(device) => (
                            <div
                                class="flex items-center gap-3 h-8 px-3 bg-[#111] border border-[#2a2a2a] rounded-sm shadow-sm hover:border-[#444] transition-colors shrink-0"
                                title={`${device.manufacturer} ${device.name} (${device.state})`}
                            >
                                <div
                                    class={`w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] ${
                                        device.state === 'connected'
                                            ? 'text-green-500 bg-green-500'
                                            : 'text-red-500 bg-red-500'
                                    }`}
                                ></div>
                                <span class="text-xs font-bold text-neutral-300 tracking-wide uppercase truncate max-w-40">
                                    {device.name}
                                </span>
                            </div>
                        )}
                    </For>
                </Show>
            </div>
        </div>
    );
};
