import { type Component, createEffect, createSignal, onCleanup } from 'solid-js';

interface KnobProps {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (v: number) => void;
    color?: string;
}

/**
 * A professional rotary control that behaves like a vertical fader.
 * Handles drag interactions and synchronizes with external value updates.
 * Renders an SVG arc to visualize the current value relative to the min/max range.
 */
export const Knob: Component<KnobProps> = (props) => {
    const [knobRef, setKnobRef] = createSignal<HTMLDivElement>();
    const [isDragging, setIsDragging] = createSignal(false);

    const [localValue, setLocalValue] = createSignal(props.value ?? props.min);

    /**
     * Synchronize local state with props.
     * Only update from props if the user is NOT dragging to prevent state fighting.
     */
    createEffect(() => {
        if (!isDragging()) {
            setLocalValue(props.value ?? props.min);
        }
    });

    const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        if (!knobRef()) return;
        setIsDragging(true);

        const startY = e.clientY;
        const startVal = localValue();
        const range = props.max - props.min;
        const sensitivity = 0.005;

        const onMove = (ev: MouseEvent) => {
            const deltaY = startY - ev.clientY;
            const change = deltaY * sensitivity * range;
            const newVal = Math.min(props.max, Math.max(props.min, startVal + change));

            setLocalValue(newVal);
            props.onChange(newVal);
        };

        const onUp = () => {
            setIsDragging(false);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
        };

        document.body.style.cursor = 'ns-resize';
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    onCleanup(() => {
        document.body.style.cursor = '';
    });

    // SVG Geometry Constants (Calculated for 48x48 view box)
    const center = 24;
    const radius = 19; // Increased radius for fuller look
    const circumference = 2 * Math.PI * radius;
    const arcLength = 0.75 * circumference;
    const pct = () => (localValue() - props.min) / (props.max - props.min);
    const dashArray = () => `${pct() * arcLength} ${circumference}`;
    const pointerRotation = () => -135 + pct() * 270;

    return (
        <div class="flex flex-col items-center gap-2 w-20">
            <div
                ref={setKnobRef}
                class="relative w-16 h-16 cursor-ns-resize group transition-transform active:scale-95"
                onMouseDown={handleMouseDown}
            >
                <svg class="w-full h-full drop-shadow-sm" viewBox="0 0 48 48">
                    {/* Background Track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#222"
                        stroke-width="4"
                        stroke-dasharray={`${arcLength} ${circumference}`}
                        transform={`rotate(135 ${center} ${center})`}
                        stroke-linecap="round"
                    />
                    {/* Value Arc */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={props.color || '#3b82f6'}
                        stroke-width="4"
                        stroke-dasharray={dashArray()}
                        stroke-dashoffset="0"
                        transform={`rotate(135 ${center} ${center})`}
                        stroke-linecap="round"
                    />
                    {/* Inner Cap */}
                    <circle cx={center} cy={center} r="12" fill="#181818" stroke="#2a2a2a" stroke-width="1" />
                    {/* Indicator Line */}
                    <line
                        x1={center}
                        y1={center}
                        x2={center}
                        y2={center - 12}
                        stroke="white"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        transform={`rotate(${pointerRotation()} ${center} ${center})`}
                    />
                </svg>
            </div>
            <div class="flex flex-col items-center gap-0 pointer-events-none">
                <span class="text-xs font-bold text-[#888] uppercase tracking-wide">{props.label}</span>
                <span
                    class={`text-sm font-mono leading-none mt-1 ${
                        isDragging() ? 'text-blue-400 font-bold' : 'text-[#aaa]'
                    }`}
                >
                    {localValue().toFixed(2)}
                </span>
            </div>
        </div>
    );
};
