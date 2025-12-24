import React, { useState, useEffect, useRef } from 'react';

interface GameHUDProps {
    title: string;
    iconColorClass?: string; // e.g., 'bg-green-500'
    money?: number;
    seatLabel?: string | null;
    onLeave: () => void;
    initialPos?: { x: number; y: number };
    headerExtra?: React.ReactNode;
    footerLeft?: React.ReactNode;
    footerRight?: React.ReactNode;
    children: React.ReactNode;
    confirmLeaveText?: string;
    widthClass?: string; // Allow overriding width (default w-[38%])
}

export const GameHUD = ({
                            title,
                            iconColorClass = 'bg-zinc-500',
                            money,
                            seatLabel,
                            onLeave,
                            initialPos = { x: 50, y: 50 },
                            headerExtra,
                            footerLeft,
                            footerRight,
                            children,
                            confirmLeaveText = 'LEAVE ACTIVITY?',
                            widthClass = 'w-[38%] min-w-[340px]'
                        }: GameHUDProps) => {
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [pos, setPos] = useState(initialPos);

    const hudRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartOffset = useRef({ x: 0, y: 0 });

    // --- DRAG LOGIC ---
    const onMouseDown = (e: React.MouseEvent) => {
        if (!hudRef.current) return;
        const parent = hudRef.current.parentElement;
        if (!parent) return;
        isDragging.current = true;
        const hudRect = hudRef.current.getBoundingClientRect();
        // Calculate offset from center of HUD for smoother feel
        dragStartOffset.current = {
            x: e.clientX - (hudRect.left + hudRect.width / 2),
            y: e.clientY - (hudRect.top + hudRect.height / 2)
        };
        document.body.style.cursor = 'move';
        document.body.style.userSelect = 'none';
    };

    useEffect(() => {
        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!isDragging.current || !hudRef.current) return;
            const parent = hudRef.current.parentElement;
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            const newX = ((moveEvent.clientX - dragStartOffset.current.x - rect.left) / rect.width) * 100;
            const newY = ((moveEvent.clientY - dragStartOffset.current.y - rect.top) / rect.height) * 100;
            setPos({
                x: Math.min(Math.max(newX, 5), 95),
                y: Math.min(Math.max(newY, 5), 95)
            });
        };
        const stopDragging = () => {
            isDragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stopDragging);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopDragging);
        };
    }, []);

    // --- KEY LOGIC ---
    useEffect(() => {
        const handleKeyDown = (keyEvent: KeyboardEvent) => {
            if (keyEvent.code === 'KeyE') {
                if (confirmLeave) {
                    onLeave();
                } else {
                    setConfirmLeave(true);
                }
            } else if (confirmLeave) {
                setConfirmLeave(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmLeave, onLeave]);

    // --- RENDER ---
    return (
        <div className='absolute inset-0 pointer-events-none overflow-hidden z-50 font-mono text-white'>
            {/* Global Glint Animation Style */}
            <style>{`
                @keyframes glintMove {
                  0% { transform: translateX(-60px); }
                  100% { transform: translateX(160px); }
                }
            `}</style>

            {/* CONFIRMATION OVERLAY */}
            {confirmLeave && (
                <div className='absolute inset-0 flex items-center justify-center bg-black/90 z-[100] pointer-events-auto'>
                    <div
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--text-main)' }}
                        className='p-6 border-4 text-center shadow-[12px_12px_0_#000]'
                    >
                        <div className='text-xl font-black mb-4 uppercase'>{confirmLeaveText}</div>
                        <button
                            onClick={onLeave}
                            className='px-10 py-2 bg-white text-black font-black border-2 border-black uppercase hover:bg-zinc-200 transition-colors'
                        >
                            [E] - Confirm
                        </button>
                        <div className='mt-2'><span className='text-zinc-500 text-xs'>Press any other key to cancel</span></div>
                    </div>
                </div>
            )}

            {/* WINDOW */}
            <div
                ref={hudRef}
                style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--text-main)',
                }}
                className={`absolute pointer-events-auto border-4 shadow-[4px_4px_0_#000] flex flex-col select-none overflow-hidden ${widthClass}`}
            >
                {/* HEADER */}
                <div
                    onMouseDown={onMouseDown}
                    className='bg-black h-8 flex items-center justify-between px-3 cursor-move shrink-0 border-b-2 border-white/5'
                >
                    <div className='flex items-center gap-2'>
                        <div className={`w-1.5 h-1.5 aspect-square animate-bounce ${iconColorClass}`} />
                        <span className='text-[9px] font-black uppercase text-zinc-400'>{title}</span>
                        {headerExtra}
                    </div>
                    <div className='flex items-center gap-2'>
                        {money !== undefined && (
                            <span className='text-sm font-black text-green-400 tabular-nums'>${money}</span>
                        )}
                        {seatLabel && (
                            <span className='text-[9px] bg-zinc-800 px-2 py-0.5 border border-white/10'>
                                {seatLabel.toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>

                {/* BODY */}
                <div className='p-4 grow flex flex-col gap-4 relative'>
                    {children}
                </div>

                {/* FOOTER */}
                <div className='h-6 bg-black flex justify-between items-center px-3 shrink-0'>
                    <div className='text-[8px] text-zinc-600 font-bold uppercase'>
                        {footerLeft}
                    </div>
                    <div className='text-[10px] text-zinc-500 font-black uppercase tracking-tighter'>
                        {footerRight}
                    </div>
                </div>
            </div>
        </div>
    );
};
