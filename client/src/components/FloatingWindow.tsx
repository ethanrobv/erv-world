import { useState, useEffect, useRef, useLayoutEffect, type ReactNode, type MouseEvent } from 'react';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */

/* -------------------------------------------------------------------------- */

interface FloatingWindowProps {
    title: string;
    children: ReactNode;
    zIndex?: number;
    onFocus?: () => void;
    initialPosition?: { x: number; y: number };
    initialSize?: { width: number; height: number };
    onClose?: () => void;
}

interface DragState {
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
    minY: number;
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function FloatingWindow({
                                           children,
                                           zIndex = 10,
                                           onFocus,
                                           initialPosition = { x: 250, y: 250 },
                                           initialSize = { width: 500, height: 350 },
                                           title,
                                           onClose
                                       }: FloatingWindowProps) {
    // State
    const [position, setPosition] = useState(initialPosition);
    const [size, setSize] = useState(initialSize);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Refs for state tracking during events
    const preMaximizeState = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
    const actionStart = useRef<DragState | null>(null);

    /* -------------------------------------------------------------------------- */
    /* LIFECYCLE & INITIALIZATION                                                 */
    /* -------------------------------------------------------------------------- */

    useLayoutEffect(() => {
        // Adjust initial position if it overlaps with the navbar
        const navbar = document.getElementById('main-navbar');
        if (navbar) {
            const navbarHeight = navbar.offsetHeight;
            if (position.y < navbarHeight) {
                setPosition((prev) => ({ ...prev, y: navbarHeight + 10 }));
            }
        }
    }, []);

    /* -------------------------------------------------------------------------- */
    /* HANDLERS: WINDOW CONTROL                                                   */
    /* -------------------------------------------------------------------------- */

    const handleToggleMaximize = (e: MouseEvent) => {
        e.stopPropagation();

        if (isMaximized) {
            // Restore
            if (preMaximizeState.current) {
                setPosition({ x: preMaximizeState.current.x, y: preMaximizeState.current.y });
                setSize({ width: preMaximizeState.current.width, height: preMaximizeState.current.height });
            }
            setIsMaximized(false);
        } else {
            // Maximize
            preMaximizeState.current = { ...position, ...size };

            const navbar = document.getElementById('main-navbar');
            const navbarHeight = navbar ? navbar.offsetHeight : 0;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            setPosition({ x: 0, y: navbarHeight });
            setSize({ width: windowWidth, height: windowHeight - navbarHeight });
            setIsMaximized(true);
        }
    };

    /* -------------------------------------------------------------------------- */
    /* HANDLERS: DRAG & RESIZE INPUT                                              */
    /* -------------------------------------------------------------------------- */

    const handleDragStart = (e: MouseEvent<HTMLDivElement>) => {
        if (isMaximized) return;
        // Allow dragging only from header, ignore buttons inside header
        if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button')) return;

        e.preventDefault();
        setIsDragging(true);

        const navbar = document.getElementById('main-navbar');
        const currentNavbarHeight = navbar ? navbar.offsetHeight : 0;

        actionStart.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: position.x,
            startTop: position.y,
            startWidth: 0, // Unused for drag
            startHeight: 0, // Unused for drag
            minY: currentNavbarHeight,
        };
    };

    const handleResizeStart = (e: MouseEvent<HTMLDivElement>) => {
        if (isMaximized) return;

        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        actionStart.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: 0, // Unused for resize
            startTop: 0, // Unused for resize
            startWidth: size.width,
            startHeight: size.height,
            minY: 0,
        };
    };

    /* -------------------------------------------------------------------------- */
    /* EFFECTS: GLOBAL EVENT LISTENERS                                            */
    /* -------------------------------------------------------------------------- */

    useEffect(() => {
        // Native DOM Event Handler
        const handleMouseMove = (e: globalThis.MouseEvent) => {
            if (!actionStart.current) return;

            if (isResizing) {
                const dx = e.clientX - actionStart.current.startX;
                const dy = e.clientY - actionStart.current.startY;

                const newWidth = Math.max(actionStart.current.startWidth + dx, 250);
                const newHeight = Math.max(actionStart.current.startHeight + dy, 150);

                setSize({ width: newWidth, height: newHeight });

            } else if (isDragging) {
                const viewportW = window.innerWidth;
                const viewportH = window.innerHeight;

                const maxX = viewportW - size.width;
                const maxY = viewportH - size.height;
                const minY = actionStart.current.minY;

                const dx = e.clientX - actionStart.current.startX;
                const dy = e.clientY - actionStart.current.startY;

                let newX = actionStart.current.startLeft + dx;
                let newY = actionStart.current.startTop + dy;

                // Constrain to viewport
                newX = Math.max(0, Math.min(newX, maxX));
                newY = Math.max(minY, Math.min(newY, maxY));

                setPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, size.width, size.height]);

    /* -------------------------------------------------------------------------- */
    /* RENDER                                                                     */
    /* -------------------------------------------------------------------------- */

    return (
        <div
            className={ `fixed flex flex-col overflow-hidden rounded-xl border border-border-base bg-surface shadow-2xl transition-colors duration-300 ${ isMaximized ? 'rounded-none border-0' : '' }` }
            style={ {
                width: size.width,
                height: size.height,
                left: 0,
                top: 0,
                zIndex: zIndex,
                transform: `translate(${ position.x }px, ${ position.y }px)`,
                transition: isDragging || isResizing ? 'none' : 'width 0.2s ease, height 0.2s ease, transform 0.2s ease',
            } }
            onMouseDownCapture={ onFocus }
        >
            {/* Header / Drag Handle */ }
            <div
                onMouseDown={ handleDragStart }
                className={ `flex items-center justify-between border-b border-border-base bg-surface-highlight px-4 py-2 select-none ${ isMaximized ? 'cursor-default' : 'cursor-move' }` }
                onDoubleClick={ handleToggleMaximize }
            >
                <span className='text-sm font-semibold text-text-main'>{ title }</span>

                <div className='flex items-center gap-2'>
                    {/* Maximize / Restore Toggle */ }
                    <button
                        onClick={ handleToggleMaximize }
                        className='flex size-6 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text-main transition-colors'
                        aria-label={ isMaximized ? 'Restore' : 'Maximize' }
                    >
                        { isMaximized ? (
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'
                                 className='size-4'>
                                <rect x='8' y='8' width='11' height='11' rx='1'/>
                                <path d='M5 15H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'/>
                            </svg>
                        ) : (
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'
                                 className='size-4'>
                                <rect x='5' y='5' width='14' height='14' rx='1'/>
                            </svg>
                        ) }
                    </button>

                    {/* Close Button */ }
                    { onClose && (
                        <button
                            onClick={ onClose }
                            className='flex size-6 items-center justify-center font-bold rounded-md text-xl text-text-muted hover:bg-primary hover:text-white transition-colors'
                            aria-label='Close'
                        >
                            &times;
                        </button>
                    ) }
                </div>
            </div>

            {/* Window Content */ }
            <div className='flex-1 overflow-auto p-4 bg-surface text-text-main'>
                { children }
            </div>

            {/* Resize Handle */ }
            { !isMaximized && (
                <div
                    onMouseDown={ handleResizeStart }
                    className='absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize touch-none'
                >
                    <svg
                        viewBox='0 0 24 24'
                        className='absolute bottom-1 right-1 size-3 text-text-muted opacity-50 pointer-events-none'
                        fill='currentColor'
                    >
                        <path d='M22 22H10L22 10V22Z'/>
                    </svg>
                </div>
            ) }
        </div>
    );
}
