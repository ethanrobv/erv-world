import { type Component, type JSX, onCleanup, createSignal } from 'solid-js';

export interface WindowFrameProps {
    // State Props (Normalized 0.0 to 1.0)
    title: string;
    isOpen: boolean;
    isPinned: boolean;
    zIndex: number;
    x: number;
    y: number;
    width: number;
    height: number;

    // Constraints (Pixels)
    minWidth: number;
    minHeight: number;

    // Events (Returns Normalized 0-1 values)
    onClose: () => void;
    onTogglePin: () => void;
    onFocus: () => void;
    onMove: (x: number, y: number) => void;
    onResize: (width: number, height: number) => void;

    children: JSX.Element;
}

/**
 * A generic draggable and resizable window container.
 * Uses a hybrid approach:
 * 1. Renders using CSS Percentages for responsive layout.
 * 2. Calculates interactions relative to the parent container's dimensions.
 */
export const WindowFrame: Component<WindowFrameProps> = (props) => {
    const [windowRef, setWindowRef] = createSignal<HTMLDivElement>();

    // Local state for active interactions
    let dragOffset = { x: 0, y: 0 };
    let isDragging = false;
    let isResizing = false;
    let resizeStart = { x: 0, y: 0 };
    let startDim = { w: 0, h: 0 };
    let startPos = { x: 0, y: 0 };

    // Dynamic Style Helpers
    const getWindowStyles = () => ({
        left: `${props.x * 100}%`,
        top: `${props.y * 100}%`,
        width: `${props.width * 100}%`,
        height: `${props.height * 100}%`,
        'z-index': props.zIndex,
        'border-color': props.isPinned
            ? 'rgba(234, 179, 8, 0.5)'
            : props.zIndex >= 40
              ? 'rgba(59, 130, 246, 0.5)'
              : '#333',
        'background-color': 'rgba(20, 20, 20, 0.95)',
        'box-shadow': props.isPinned
            ? '0 0 0 1px rgba(234, 179, 8, 0.2), 0 20px 50px rgba(0,0,0,0.8)'
            : '0 0 0 1px rgba(0,0,0,0.5), 0 20px 50px rgba(0,0,0,0.8)',
    });

    const getContainerClass = () =>
        `absolute flex flex-col rounded-lg border backdrop-blur-xl shadow-2xl transition-opacity duration-100 ${
            props.isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`;

    const getHeaderClass = () =>
        `h-8 shrink-0 flex items-center justify-between px-3 border-b border-white/10 select-none rounded-t-lg transition-colors ${
            props.isPinned ? 'bg-yellow-900/20 cursor-default' : 'bg-white/5 cursor-grab active:cursor-grabbing'
        }`;

    const getPinButtonClass = () =>
        `w-6 h-6 flex items-center justify-center rounded transition-colors ${
            props.isPinned
                ? 'text-yellow-400 hover:bg-yellow-900/40'
                : 'text-gray-500 hover:text-white hover:bg-white/10'
        }`;

    const getResizeHandleClass = () =>
        `absolute bottom-0 right-0 w-4 h-4 z-50 flex items-end justify-end p-0.5 ${
            props.isPinned ? 'opacity-0 pointer-events-none' : 'cursor-nwse-resize opacity-50 hover:opacity-100'
        }`;

    const handleFocus = (e: MouseEvent) => {
        e.stopPropagation();
        props.onFocus();
    };

    const startDrag = (e: MouseEvent) => {
        const ref = windowRef();
        if (props.isPinned || e.target !== e.currentTarget || !ref) return;

        e.preventDefault();
        isDragging = true;
        props.onFocus();

        // Calculate offset based on the exact rendered pixel position
        const rect = ref.getBoundingClientRect();
        dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };

        window.addEventListener('mousemove', onDrag);
        window.addEventListener('mouseup', stopDrag);
    };

    const onDrag = (e: MouseEvent) => {
        const ref = windowRef();
        if (!isDragging || !ref || !ref.offsetParent) return;

        // Get container dimensions to support drag within any positioned parent
        const containerRect = ref.offsetParent.getBoundingClientRect();

        // Calculate mouse position relative to the container
        const relativeMouseX = e.clientX - containerRect.left;
        const relativeMouseY = e.clientY - containerRect.top;

        // Apply drag offset
        let newLeft = relativeMouseX - dragOffset.x;
        let newTop = relativeMouseY - dragOffset.y;

        // Get current dimensions in pixels for clamping
        const currentWidth = props.width * containerRect.width;
        const currentHeight = props.height * containerRect.height;

        // Clamp to container bounds
        newLeft = Math.max(0, Math.min(newLeft, containerRect.width - currentWidth));
        newTop = Math.max(0, Math.min(newTop, containerRect.height - currentHeight));

        // Normalize to percentage
        props.onMove(newLeft / containerRect.width, newTop / containerRect.height);
    };

    const stopDrag = () => {
        isDragging = false;
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    };

    const startResize = (e: MouseEvent) => {
        const ref = windowRef();
        if (props.isPinned || !ref) return;

        e.stopPropagation();
        e.preventDefault();

        props.onFocus();
        isResizing = true;
        resizeStart = { x: e.clientX, y: e.clientY };

        const rect = ref.getBoundingClientRect();
        startDim = { w: rect.width, h: rect.height };
        startPos = { x: rect.left, y: rect.top };

        window.addEventListener('mousemove', onResize);
        window.addEventListener('mouseup', stopResize);
    };

    const onResize = (e: MouseEvent) => {
        const ref = windowRef();
        if (!isResizing || !ref || !ref.offsetParent) return;

        const containerRect = ref.offsetParent.getBoundingClientRect();

        const dx = e.clientX - resizeStart.x;
        const dy = e.clientY - resizeStart.y;

        let newW = startDim.w + dx;
        let newH = startDim.h + dy;

        // Enforce Min Dimensions
        newW = Math.max(props.minWidth, newW);
        newH = Math.max(props.minHeight, newH);

        // Enforce Container Bounds
        // Convert screen-space start position to container-relative
        const relativeStartX = startPos.x - containerRect.left;
        const relativeStartY = startPos.y - containerRect.top;

        newW = Math.min(newW, containerRect.width - relativeStartX);
        newH = Math.min(newH, containerRect.height - relativeStartY);

        // Normalize
        props.onResize(newW / containerRect.width, newH / containerRect.height);
    };

    const stopResize = () => {
        isResizing = false;
        window.removeEventListener('mousemove', onResize);
        window.removeEventListener('mouseup', stopResize);
    };

    onCleanup(() => {
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
        window.removeEventListener('mousemove', onResize);
        window.removeEventListener('mouseup', stopResize);
    });

    return (
        <div ref={setWindowRef} class={getContainerClass()} style={getWindowStyles()} onMouseDown={handleFocus}>
            <div class={getHeaderClass()} onMouseDown={startDrag}>
                <div class="flex items-center gap-2 pointer-events-none">
                    <span
                        class={`text-xs font-bold tracking-wide uppercase ${
                            props.isPinned ? 'text-yellow-500' : 'text-gray-400'
                        }`}
                    >
                        {props.title} {props.isPinned && '(PINNED)'}
                    </span>
                </div>

                <div class="flex items-center gap-1">
                    <button
                        class={getPinButtonClass()}
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onTogglePin();
                        }}
                        title={props.isPinned ? 'Unpin Window' : 'Pin Window'}
                    >
                        {/* Push Pin Icon */}
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill={props.isPinned ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22H13V16H18V14L16 12Z" />
                        </svg>
                    </button>

                    <button
                        class="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 rounded hover:bg-white/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            props.onClose();
                        }}
                        title="Close Window"
                    >
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div class="flex-1 overflow-hidden relative">{props.children}</div>

            <div class={getResizeHandleClass()} onMouseDown={startResize}>
                <svg width="8" height="8" viewBox="0 0 10 10" fill="gray">
                    <path d="M10 10L10 0L0 10Z" />
                </svg>
            </div>
        </div>
    );
};
