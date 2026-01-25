import { type Component, For, type JSX } from 'solid-js';
import type { ControlDef } from '../../core/audio/plugins';

interface OptionSelectorProps {
    def: ControlDef;
    value: number;
    onChange: (v: number) => void;
}

const ICONS: Record<string, () => JSX.Element> = {
    Saw: () => (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M2 20L12 4L12 20L22 4" />
        </svg>
    ),
    Pulse: () => (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M2 18L2 6L12 6L12 18L22 18" />
        </svg>
    ),
    Sine: () => (
        <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M2 12C2 12 5 2 12 12C19 22 22 12 22 12" />
        </svg>
    ),
};

/**
 * Segmented control for selecting discrete options.
 * Renders a row of buttons based on the control definition options.
 * Uses a gap-based grid on a dark background to create divider lines, ensuring buttons fill 100% of their cell.
 */
export const OptionSelector: Component<OptionSelectorProps> = (props) => {
    const options = props.def.options || [];

    return (
        <div class="flex flex-col items-center gap-2 min-w-fit">
            <div
                class="grid bg-[#333] rounded-md border border-[#333] h-16 overflow-hidden"
                style={{
                    'grid-template-columns': `repeat(${options.length}, minmax(4rem, 1fr))`,
                    gap: '1px',
                }}
            >
                <For each={options}>
                    {(opt) => {
                        const Icon = opt.icon ? ICONS[opt.icon] : null;
                        const isActive = () => Math.abs(props.value - opt.value) < 0.01;

                        return (
                            <button
                                class={`w-full h-full flex flex-col items-center justify-center transition-colors duration-200 ${
                                    isActive()
                                        ? 'bg-[#2a2a2a] text-blue-400'
                                        : 'bg-[#111] text-[#666] hover:text-[#999] hover:bg-[#161616]'
                                }`}
                                onClick={() => props.onChange(opt.value)}
                                title={opt.label}
                            >
                                {Icon && <Icon />}
                                <span class="text-xs font-bold uppercase tracking-wider mt-1 whitespace-nowrap px-1">
                                    {opt.label}
                                </span>
                            </button>
                        );
                    }}
                </For>
            </div>

            <div class="flex flex-col items-center gap-0 pointer-events-none">
                <span class="text-xs font-bold text-[#888] uppercase tracking-wide">{props.def.label}</span>
                <span class="text-sm font-mono leading-none mt-1 text-transparent select-none">-</span>
            </div>
        </div>
    );
};
