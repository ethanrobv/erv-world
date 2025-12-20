import React, { useState, useEffect, useRef } from 'react';
import { FADE_IN_DURATION, FADE_OUT_DURATION } from './GameConfig';
import type { Card, BJSeatState } from './GameConfig';
import { calculateHand } from './logic/Blackjack';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */

/* -------------------------------------------------------------------------- */

interface CasinoChipProps {
    value: number;
    colorVar: string;
    isSelected: boolean;
    onClick: () => void;
    disabled: boolean;
}

interface BlackjackHUDProps {
    seat: BJSeatState;
    dealerHand: Card[];
    isMyTurn: boolean;
    onBet: (amt: number) => void;
    onAction: (act: 'hit' | 'stand') => void;
    onLeave: () => void;
    seatLabel?: string | null;
    money: number;
    exitLabel?: string | null;
}

interface MainMenuProps {
    onHost: () => void;
    onJoin: (id: string) => Promise<void>;
    onNameChange: (n: string) => void;
    name: string;
}

/* -------------------------------------------------------------------------- */
/* EFFECTS & TRANSITIONS                                                      */
/* -------------------------------------------------------------------------- */

export const TransitionOverlay = ({ isActive }: { isActive: boolean }) => {
    const duration = isActive ? FADE_OUT_DURATION : FADE_IN_DURATION;
    return (
        <div
            style={ {
                position: 'absolute',
                inset: 0,
                backgroundColor: '#000',
                opacity: isActive ? 1 : 0,
                transition: `opacity ${ duration }ms ease-in-out`,
                pointerEvents: 'none',
                zIndex: 100
            } }
        />
    );
};

export const InteractionPrompt = ({ label }: { label: string | null }) => {
    if (!label) return null;

    return (
        <div className='absolute bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none'>
            <div className='bg-black/80 border-2 border-white px-4 py-2 shadow-[4px_4px_0_#000]'>
        <span className='text-white font-mono text-sm uppercase tracking-widest animate-pulse'>
          [E] { label }
        </span>
            </div>
        </div>
    );
};

export const SystemFeed = ({ messages }: { messages: Array<{ id: number; text: string }> }) => (
    <div className='absolute top-4 right-4 z-50 flex flex-col gap-1 items-end pointer-events-none font-mono'>
        { messages.map((msg) => (
            <div
                key={ msg.id }
                className='bg-black/80 px-3 py-1 text-xs text-white border-r-2 border-primary'
            >
                { msg.text }
            </div>
        )) }
    </div>
);

/* -------------------------------------------------------------------------- */
/* GAMEPLAY ASSETS (2D)                                                       */
/* -------------------------------------------------------------------------- */

const CasinoChip = ({ value, colorVar, isSelected, onClick, disabled }: CasinoChipProps) => {
    return (
        <div className='flex-1 flex justify-center px-1'>
            <button
                onClick={ onClick }
                disabled={ disabled }
                className={ `
                    relative w-14 h-14 rounded-full transition-all duration-200 select-none
                    ${ disabled ? 'opacity-20 grayscale cursor-not-allowed' : 'cursor-pointer' }
                ` }
            >
                {/* 3D EDGE */ }
                <div className='absolute inset-0 rounded-full bg-black translate-y-[5px]'/>

                {/* THE TOP SURFACE */ }
                <div
                    style={ {
                        backgroundColor: `var(${ colorVar })`,
                        boxShadow: isSelected ? '0 0 0 4px white' : 'none'
                    } }
                    className={ `
                        absolute inset-0 rounded-full border-[3px] border-black flex items-center justify-center
                        overflow-hidden 
                        ${ isSelected ? 'translate-y-0.5' : '-translate-y-px' } 
                        transition-all duration-200
                  ` }
                >
                    {/* Surface Detail Ridges */ }
                    <div
                        className='absolute inset-0 rounded-full border-4 border-dashed border-black/15 pointer-events-none'/>

                    {/* HIGH-CONTRAST GLINT */ }
                    { isSelected && (
                        <div
                            className='absolute inset-0 w-full h-full pointer-events-none z-20'
                            style={ { transform: 'rotate(-45deg)' } }
                        >
                            <div
                                className='absolute top-0 h-[200%] w-6 bg-white/40 blur-xs animate-[glintMove_0.5s_ease-in-out_forwards]'
                                style={ { left: '-100%', top: '-50%' } }
                            />
                        </div>
                    ) }

                    {/* Denomination Circle */ }
                    <div
                        className='w-9 h-9 rounded-full bg-white border-[3px] border-black flex items-center justify-center z-10 shadow-inner'>
                        <span className='text-black font-[1000] text-sm font-mono leading-none'>
                            ${ value }
                        </span>
                    </div>
                </div>
                <style>{ `
                    @keyframes glintMove {
                    0% { transform: translateX(-60px); }
                    100% { transform: translateX(160px); }
                    }
                ` }</style>
            </button>
        </div>
    );
};

const Card2D = ({ card }: { card: Card }) => {
    const isRed = ['♥', '♦'].includes(card.suit);
    return (
        <div
            className='w-10 h-14 bg-white rounded-sm border border-gray-300 flex flex-col items-center justify-center shadow-md select-none'>
            <span className={ `text-sm font-bold leading-none ${ isRed ? 'text-red-600' : 'text-black' }` }>
                { card.rank }
            </span>
            <span className={ `text-lg leading-none ${ isRed ? 'text-red-600' : 'text-black' }` }>
                { card.suit }
            </span>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* HUD & MENUS                                                                */
/* -------------------------------------------------------------------------- */
/**
 * High-contrast, outline-style HUD for Blackjack gameplay.
 * Designed with fixed height to prevent display cutoff.
 */
export const BlackjackHUD = ({
                                 seat,
                                 dealerHand,
                                 isMyTurn,
                                 onBet,
                                 onAction,
                                 onLeave,
                                 seatLabel,
                                 money,
                                 exitLabel
                             }: BlackjackHUDProps) => {
    const [selectedBet, setSelectedBet] = useState<number | null>(null);
    const [confirmLeave, setConfirmLeave] = useState(false);

    const [pos, setPos] = useState({ x: 50, y: 30 });
    const hudRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    const dragStartOffset = useRef({ x: 0, y: 0 });

    const handTotal = calculateHand(seat.hand);
    const dealerTotal = calculateHand(dealerHand);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!hudRef.current) return;
        const parent = hudRef.current.parentElement;
        if (!parent) return;

        isDragging.current = true;
        const hudRect = hudRef.current.getBoundingClientRect();

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
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', stopDragging);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', stopDragging);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (keyEvent: KeyboardEvent) => {
            if (keyEvent.code === 'KeyE') {
                keyEvent.stopPropagation();
                if (confirmLeave) onLeave();
                else setConfirmLeave(true);
            } else if (confirmLeave) {
                setConfirmLeave(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [confirmLeave, onLeave]);

    return (
        <div className='absolute inset-0 pointer-events-none overflow-hidden z-50'>
            {/* LEAVE CONFIRMATION MODAL */ }
            { confirmLeave && (
                <div
                    className='absolute inset-0 flex items-center justify-center bg-black/90 z-100 pointer-events-auto'>
                    <div
                        style={ { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--text-main)' } }
                        className='p-6 border-4 text-white font-mono text-center shadow-[12px_12px_0_#000]'
                    >
                        <div className='text-xl font-black mb-4 uppercase'>LEAVE TABLE?</div>
                        <button
                            onClick={ onLeave }
                            className='px-10 py-2 bg-white text-black font-black border-2 border-black uppercase hover:bg-zinc-200'
                        >
                            [E] - Confirm
                        </button>
                        <div>
                            <span className='text-text-muted text-xs'>Press any other key to close this dialog</span>
                        </div>
                    </div>
                </div>
            ) }

            {/* MOVABLE HUD PANEL */ }
            <div
                ref={ hudRef }
                style={ {
                    left: `${ pos.x }%`,
                    top: `${ pos.y }%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--text-main)',
                    width: '38%',
                    minWidth: '340px'
                } }
                className='absolute pointer-events-auto border-4 shadow-[4px_4px_0_#000] flex flex-col font-mono text-white select-none overflow-hidden'
            >
                {/* HEADER */ }
                <div
                    onMouseDown={ onMouseDown }
                    className='bg-black h-8 flex items-center justify-between px-3 cursor-move shrink-0 border-b-2 border-white/5'
                >
                    <div className='flex items-center gap-2'>
                        <div className='w-1.5 h-1.5 bg-green-500 aspect-square animate-bounce'/>
                        <span className='text-[9px] font-black uppercase text-zinc-400'>Blackjack Session</span>
                    </div>
                    <div className='flex items-center gap-2'>
                        { seatLabel && (
                            <span className='text-[9px] bg-zinc-800 px-2 py-0.5 border border-white/10'>
                                { seatLabel.toUpperCase() }
                            </span>
                        ) }
                        <span className='text-sm font-black text-green-400 tabular-nums'>${ money }</span>
                    </div>
                </div>

                <div className='p-4 grow flex flex-col gap-4'>
                    {/* PLAYING PHASE */ }
                    { seat.status !== 'betting' ? (
                        <div className='flex flex-col gap-4 bg-black/40 p-3 border-2 border-white/5'>
                            <div className='flex justify-between items-center'>
                                <div className='flex gap-1 scale-110 origin-left'>
                                    { dealerHand.map((card, i) => (
                                        <Card2D key={ `dealer-card-${ card.suit }-${ card.value }-${ i }` }
                                                card={ card }/>
                                    )) }
                                </div>
                                <div className='text-right'>
                                    <span className='text-[8px] text-zinc-500 block font-black'>DEALER</span>
                                    <span className='text-xl font-black text-text-main'>{ dealerTotal }</span>
                                </div>
                            </div>

                            <div className='flex justify-between items-center border-t border-white/10 pt-3'>
                                <div className='flex gap-1 scale-110 origin-left'>
                                    { seat.hand.map((card, i) => (
                                        <Card2D key={ `player-card-${ card.suit }-${ card.value }-${ i }` }
                                                card={ card }/>
                                    )) }
                                </div>
                                <div className='text-right'>
                                    <span className='text-[8px] text-zinc-500 block font-black'>PLAYER</span>
                                    <span className='text-xl font-black text-text-main'>{ handTotal }</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* BETTING PHASE */
                        <div
                            className='flex flex-col items-center gap-4 py-3 bg-black/20 border-2 border-white/5 w-full'>
                            <span className='text-[9px] text-zinc-500 font-black uppercase tracking-widest'>Choose Bet Amount</span>
                            <div className='flex flex-row justify-around items-center w-full px-6'>
                                { [10, 25, 50, 100].map((val) => (
                                    <CasinoChip
                                        key={ val }
                                        value={ val }
                                        colorVar={ val === 10 ? '--game-wood' : val === 100 ? '--brand-primary' : '--game-metal' }
                                        isSelected={ selectedBet === val }
                                        onClick={ () => setSelectedBet(val) }
                                        disabled={ money < val }
                                    />
                                )) }
                            </div>
                        </div>
                    ) }

                    {/* ACTION BUTTONS */ }
                    <div className='shrink-0 h-10'>
                        { seat.status === 'betting' && (
                            <button
                                onClick={ () => selectedBet && onBet(selectedBet) }
                                disabled={ !selectedBet }
                                style={ {
                                    backgroundColor: selectedBet ? 'var(--brand-primary)' : 'var(--bg-page)',
                                    color: selectedBet ? 'var(--brand-primary)' : 'var(--text-muted)',
                                } }
                                className={ `
                                  w-full h-full border-4 border-black uppercase text-sm transition-all font-mono
                                  ${ selectedBet ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed opacity-50' }
                                ` }
                            >
                                <span
                                    style={ {
                                        filter: selectedBet ? 'invert(1)' : 'invert(0)',
                                    } }
                                >
                                    { selectedBet ? `Place Bet $${ selectedBet }` : 'Select a Chip' }</span>
                            </button>
                        ) }

                        { isMyTurn && seat.status === 'playing' && (
                            <div className='flex gap-2 h-full'>
                                <button
                                    onClick={ () => onAction('hit') }
                                    className='flex-1 bg-white text-black font-black border-2 border-black text-xs uppercase hover:bg-zinc-100'
                                >
                                    Hit
                                </button>
                                <button
                                    onClick={ () => onAction('stand') }
                                    style={ { backgroundColor: 'var(--brand-primary)', color: 'var(--brand-primary)' } }
                                    className='flex-1 border-2 border-white text-xs uppercase hover:brightness-110'
                                >
                                    <span
                                        style={ { filter: 'invert(1)' } }
                                    >Stand</span>
                                </button>
                            </div>
                        ) }

                        { ['won', 'lost', 'bust', 'push', 'blackjack'].includes(seat.status) && (
                            <div
                                className='w-full h-full flex items-center justify-center bg-white text-black font-black uppercase text-xs border-2 border-black animate-pulse'>
                                { seat.status }!
                            </div>
                        ) }
                    </div>
                </div>

                {/* FOOTER */ }
                <div className='h-6 bg-black flex justify-end items-center px-6 shrink-0'>
                    { exitLabel && (
                        <span className='text-[10px] text-zinc-500 font-black uppercase tracking-tighter'>
              [E] { exitLabel }
            </span>
                    ) }
                </div>
            </div>
        </div>
    );
};

export const MainMenu = ({ onHost, onJoin, onNameChange, name }: MainMenuProps) => {
    const [joinId, setJoinId] = useState('');

    return (
        <div className='absolute inset-0 flex items-center justify-center bg-zinc-900 z-50 font-mono'>
            <div className='w-full max-w-sm p-8 border border-zinc-700 bg-black'>
                <h1 className='text-3xl font-bold text-center text-white mb-8 tracking-widest'>
                    erv world
                </h1>

                <div className='space-y-4'>
                    <input
                        value={ name }
                        onChange={ (e) => onNameChange(e.target.value.toUpperCase()) }
                        placeholder='ENTER NAME'
                        className='w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white text-center focus:outline-none focus:border-white mb-4'
                        maxLength={ 8 }
                    />

                    <button
                        onClick={ onHost }
                        className='w-full py-3 bg-white text-black font-bold hover:bg-gray-200 transition-colors'
                    >
                        HOST GAME
                    </button>

                    <div className='text-center text-xs text-zinc-500'>- OR -</div>

                    <div className='flex gap-2'>
                        <input
                            value={ joinId }
                            onChange={ (e) => setJoinId(e.target.value.toUpperCase()) }
                            placeholder='CODE'
                            className='flex-1 bg-zinc-900 border border-zinc-700 px-4 text-white text-center focus:outline-none focus:border-white'
                        />
                        <button
                            onClick={ () => onJoin(joinId) }
                            className='px-4 border border-white text-white hover:bg-white/10'
                        >
                            JOIN
                        </button>
                    </div>
                </div>

                <div className='mt-8 text-center text-[10px] text-zinc-600'>
                    [WASD] MOVE • [E] INTERACT
                </div>
            </div>
        </div>
    );
};

export const PauseMenu = ({ onResume, onMainMenu }: { onResume: () => void; onMainMenu: () => void }) => {
    return (
        <div className='absolute inset-0 flex items-center justify-center bg-black/80 z-100 backdrop-blur-sm'>
            <div className='flex flex-col gap-4 p-8 border border-white/20 bg-black min-w-[300px]'>
                <h2 className='text-2xl text-white font-mono text-center mb-4 tracking-widest'>
                    PAUSED
                </h2>
                <button
                    onClick={ onResume }
                    className='py-3 bg-white text-black font-mono font-bold hover:bg-gray-200'
                >
                    RESUME
                </button>
                <button
                    onClick={ onMainMenu }
                    className='py-3 bg-red-900/50 text-red-200 font-mono font-bold border border-red-900 hover:bg-red-900/80'
                >
                    MAIN MENU
                </button>
            </div>
        </div>
    );
};

export const NetworkIndicator = ({
                                     roomCode,
                                     isHost,
                                     ping
                                 }: {
    roomCode: string | null;
    isHost: boolean;
    ping?: number;
}) => {
    if (!roomCode) return null;
    return (
        <div className='absolute top-4 left-4 z-40 flex items-center gap-2'>
            <div
                className='px-3 py-1 bg-black/50 backdrop-blur border border-white/10 flex items-center gap-2 font-mono text-xs text-zinc-400 rounded-full shadow-sm'>
                <div className={ `w-2 h-2 rounded-full ${ isHost ? 'bg-green-500' : 'bg-blue-500' }` }/>
                <span>
                    { isHost ? 'HOST' : 'CLIENT' }: <span className='text-white'>{ roomCode }</span>
                </span>
            </div>

            { !isHost && ping !== undefined && (
                <div
                    className='px-3 py-1 bg-black/50 backdrop-blur border border-white/10 flex items-center gap-2 font-mono text-xs text-zinc-400 rounded-full shadow-sm'>
                    <span className='tracking-wider'>
                        PING:{ ' ' }
                        <span
                            className={
                                ping < 100
                                    ? 'text-green-400'
                                    : ping < 200
                                        ? 'text-yellow-400'
                                        : 'text-red-400'
                            }
                        >
                            { ping }ms
                        </span>
                    </span>
                </div>
            ) }
        </div>
    );
};
