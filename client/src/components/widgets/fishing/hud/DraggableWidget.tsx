'use client';
import React, { useState, useRef, useEffect } from 'react';

interface Props {
    title: string;
    defaultPosition: { x: number; y: number };
    children: React.ReactNode;
}

/**
 * A floating window widget that can be dragged around the screen.
 * Constrains movement to the browser viewport boundaries.
 */
export default function DraggableWidget({ title, defaultPosition, children }: Props) {
    const [pos, setPos] = useState(defaultPosition);
    const [isDragging, setIsDragging] = useState(false);

    // Tracks the offset from the mouse click to the top-left corner of the widget
    const offset = useRef({ x: 0, y: 0 });

    // Ref to the widget element for dimension calculations
    const widgetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !widgetRef.current) return;

            // Calculate raw new position
            let newX = e.clientX - offset.current.x;
            let newY = e.clientY - offset.current.y;

            // Get dimensions for clamping
            const widgetWidth = widgetRef.current.offsetWidth;
            const widgetHeight = widgetRef.current.offsetHeight;
            const maxX = window.innerWidth - widgetWidth;
            const maxY = window.innerHeight - widgetHeight;

            // Clamp to viewport
            // We use Math.max(0, ...) to prevent negative coordinates
            // We use Math.min(maxX, ...) to prevent going off the right/bottom
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            setPos({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only allow dragging from the header, so check target/bubbling if needed,
        // but since this event is attached to the header div, it's safe.
        setIsDragging(true);
        offset.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y
        };
    };

    return (
        <div
            ref={ widgetRef }
            style={ { left: pos.x, top: pos.y } }
            className="absolute pointer-events-auto bg-black border-2 border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-auto min-w-[200px] select-none z-50"
        >
            {/* Drag Handle */ }
            <div
                onMouseDown={ handleMouseDown }
                className={ `
                    px-2 py-1 text-sm font-bold cursor-move flex justify-between items-center border-b-2 border-white transition-colors
                    ${ isDragging ? 'bg-blue-700' : 'bg-blue-900 hover:bg-blue-800' } text-white
                ` }
            >
                <span>{ title.toUpperCase() }</span>
                <div className="flex gap-1">
                    <div className="w-2 h-2 bg-red-500 border border-white"></div>
                </div>
            </div>

            {/* Content */ }
            <div className="p-2 text-white font-mono text-sm cursor-default">
                { children }
            </div>
        </div>
    );
}
