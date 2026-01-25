import { createSignal, type Component, Show, onCleanup } from 'solid-js';

interface DragValueProps {
    /** The current numeric value to display. */
    value: number;
    /** Callback fired when the value changes via drag or direct edit. */
    onChange: (value: number) => void;
    /** Optional callback fired when dragging begins (mousedown). Useful for History transactions. */
    onDragStart?: () => void;
    /** Optional callback fired when dragging ends (mouseup). Useful for History transactions. */
    onDragEnd?: () => void;
    /** Optional text label to display next to the value. */
    label?: string;
    /** Minimum allowed value (inclusive). */
    min?: number;
    /** Maximum allowed value (inclusive). */
    max?: number;
    /** Multiplier for drag sensitivity (default: 1). Higher = faster change. */
    sensitivity?: number;
    /** Optional function to format the display value (e.g. for rounding). */
    format?: (v: number) => string;
    /** Optional CSS classes to append to the container. */
    className?: string;
}

/**
 * A generic numeric input that allows value adjustment via vertical dragging.
 * Supports double-click to enter direct text editing mode without layout shift.
 */
export const DragValue: Component<DragValueProps> = (props) => {
    const [isEditing, setIsEditing] = createSignal(false);
    const [inputRef, setInputRef] = createSignal<HTMLInputElement>();

    // Drag State
    let startY = 0;
    let startVal = 0;

    const handleMouseDown = (e: MouseEvent) => {
        if (isEditing() || e.button !== 0) return;
        e.preventDefault();

        if (props.onDragStart) {
            props.onDragStart();
        }

        startY = e.clientY;
        startVal = props.value;

        document.body.style.cursor = 'ns-resize';
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const deltaY = startY - e.clientY;
        const step = props.sensitivity || 1;

        let newVal = startVal + deltaY * step;

        if (props.min !== undefined) newVal = Math.max(props.min, newVal);
        if (props.max !== undefined) newVal = Math.min(props.max, newVal);

        props.onChange(newVal);
    };

    const handleMouseUp = () => {
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        if (props.onDragEnd) {
            props.onDragEnd();
        }
    };

    const handleDblClick = () => {
        setIsEditing(true);
        // Defer focus to allow rendering
        requestAnimationFrame(() => {
            const el = inputRef();
            if (el) {
                el.focus();
                el.select();
            }
        });
    };

    const commitEdit = () => {
        const el = inputRef();
        if (!el) return;
        const rawVal = parseFloat(el.value);

        if (!isNaN(rawVal)) {
            // Wrap explicit edits in start/end callbacks if provided to ensure history consistency
            if (props.onDragStart) props.onDragStart();

            let val = rawVal;
            if (props.min !== undefined) val = Math.max(props.min, val);
            if (props.max !== undefined) val = Math.min(props.max, val);
            props.onChange(val);

            if (props.onDragEnd) props.onDragEnd();
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            commitEdit();
            if (e.currentTarget instanceof HTMLElement) e.currentTarget.blur();
        }
        if (e.key === 'Escape') setIsEditing(false);
    };

    onCleanup(() => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    });

    const displayValue = () => (props.format ? props.format(props.value) : props.value);

    return (
        <div
            class={`relative group cursor-ns-resize select-none inline-flex items-center justify-center ${props.className || ''}`}
            onMouseDown={handleMouseDown}
            onDblClick={handleDblClick}
        >
            <style>
                {`
                    /* Hide Webkit spinners */
                    .no-spinners::-webkit-outer-spin-button,
                    .no-spinners::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                    /* Firefox */
                    .no-spinners {
                        -moz-appearance: textfield;
                    }
                `}
            </style>

            {/* Display Layer: Always visible to maintain width/height */}
            <div class={`flex items-baseline justify-center gap-1 ${isEditing() ? 'opacity-0' : 'opacity-100'}`}>
                <span class="text-inherit font-inherit leading-none pointer-events-none">{displayValue()}</span>
                <Show when={props.label}>
                    <span class="text-[9px] text-neutral-500 font-bold uppercase pointer-events-none">
                        {props.label}
                    </span>
                </Show>
            </div>

            {/* Input Layer: Overlay absolute position when editing */}
            <Show when={isEditing()}>
                <input
                    ref={setInputRef}
                    type="number"
                    class="absolute inset-0 w-full h-full bg-[#1a1a1a] text-white text-center font-inherit leading-none outline-none border border-blue-500 rounded-sm no-spinners p-0 m-0 z-50 shadow-lg"
                    value={props.value}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    step="any"
                />
            </Show>
        </div>
    );
};
