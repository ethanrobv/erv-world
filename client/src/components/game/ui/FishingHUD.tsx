import { useEffect } from 'react';
import type { FishingState, FishingSeat } from '../GameConfig';
import { GameHUD } from './GameHUD';
import { useThemeColor } from "../../../hooks/useThemeColor";
import { FISH_SPECIES } from '../logic/FishingData';

interface FishingHUDProps {
    gameState: FishingState;
    mySeat: FishingSeat;
    onAction: (action: string, payload?: any) => void;
    onLeave: () => void;
    isDay: boolean;
    isRaining: boolean;
}

export const FishingHUD = ({ gameState, mySeat, onAction, onLeave, isDay, isRaining }: FishingHUDProps) => {
    const { phase, lastCatch } = mySeat;
    const { catchLog } = gameState;
    const brandColor = useThemeColor('--brand-primary') || '#2563eb';

    // --- KEYBOARD CONTROLS (SPACE TO ACT) ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                if (phase === 'idle' || phase === 'lost') {
                    onAction('CAST', { env: { isDay, isRaining } });
                } else if (phase === 'bitten') {
                    onAction('REEL');
                } else if (phase === 'caught') {
                    onAction('RESET');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, isDay, isRaining, onAction]);

    // --- HELPERS ---
    const getStatusContent = () => {
        switch (phase) {
            case 'idle':
                return <span className='text-zinc-500 text-sm font-bold uppercase'>Ready to Cast</span>;
            case 'casting':
                return <span className='text-blue-400 text-sm font-bold animate-pulse'>Casting...</span>;
            case 'waiting':
                return <span className='text-zinc-400 text-sm animate-pulse'>Waiting for bite...</span>;
            case 'bitten':
                return (
                    <div className='absolute inset-0 bg-red-500/20 flex items-center justify-center animate-bounce'>
                        <span className='text-red-400 text-xl font-black uppercase tracking-widest'>!!! BITE !!!</span>
                    </div>
                );
            case 'reeling':
                return <span className='text-yellow-400 text-sm font-bold'>Reeling...</span>;
            case 'caught':
                return lastCatch ? (
                    <div className='text-center animate-bounce'>
                        <div className='text-xs text-green-400 font-bold uppercase'>Caught!</div>
                        <div className='text-lg font-black'>{ lastCatch.fishId }</div>
                        <div className='text-xs text-zinc-400'>{ lastCatch.weight } lbs</div>
                    </div>
                ) : null;
            case 'lost':
                return <span className='text-red-500 text-sm font-bold uppercase'>Fish Got Away!</span>;
            default:
                return null;
        }
    };

    const getButtonConfig = () => {
        if (phase === 'bitten') return { text: 'REEL NOW! (SPACE)', color: '#ef4444', action: () => onAction('REEL') };
        if (phase === 'caught') return {
            text: 'KEEP FISH (SPACE)',
            color: brandColor,
            action: () => onAction('RESET')
        };
        if (phase === 'waiting') return { text: 'WAITING...', color: brandColor, disabled: true };
        if (phase === 'reeling') return { text: 'REELING...', color: brandColor, disabled: true };
        return {
            text: 'CAST LINE (SPACE)',
            color: brandColor,
            action: () => onAction('CAST', { env: { isDay, isRaining } })
        };
    };

    const btn = getButtonConfig();

    return (
        <GameHUD
            title="Fishing"
            iconColorClass="bg-blue-500"
            onLeave={ onLeave }
            initialPos={ { x: 75, y: 50 } }
            widthClass="w-[28%] min-w-[280px]"
            headerExtra={
                <>
                    { isRaining && <span className='text-[10px] text-blue-300 ml-2'>🌧️ Rain</span> }
                    { !isDay && <span className='text-[10px] text-indigo-300 ml-2'>🌙 Night</span> }
                </>
            }
            footerLeft="WASD to wiggle bobber"
            footerRight="[E] STOP FISHING"
            confirmLeaveText="STOP FISHING?"
        >
            {/* STATUS DISPLAY */ }
            <div
                className='h-24 bg-black/40 p-3 border-2 border-white/5 flex items-center justify-center relative overflow-hidden shrink-0'>
                { getStatusContent() }
            </div>

            {/* CONTROLS */ }
            <div className='shrink-0 h-10'>
                <button
                    className={ `
                        w-full h-full border-4 border-black text-sm font-black uppercase transition-all
                        ${ btn.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:translate-y-0.5' }
                    ` }
                    style={ { backgroundColor: btn.color, color: 'white' } }
                    onClick={ btn.action }
                    disabled={ btn.disabled }
                >
                    { btn.text }
                </button>
            </div>

            {/* SCROLLING STATS CONTAINER */ }
            <div className='flex flex-col gap-1 border-t border-white/10 pt-2 mt-1 min-h-0 shrink-0'>
                <div className='text-[10px] uppercase font-bold text-zinc-500 flex justify-between'>
                    <span>Fish Collection</span>
                    <span
                        className='text-zinc-600'>{ Object.keys(catchLog).length }/{ Object.keys(FISH_SPECIES).length }</span>
                </div>

                <div
                    className='h-32 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent bg-black/10 rounded p-1'>
                    { Object.values(FISH_SPECIES).map((fish) => {
                        const record = catchLog[fish.id];
                        const isCaught = !!record;

                        return (
                            <div
                                key={ fish.id }
                                className={ `flex items-center gap-2 p-1.5 rounded border transition-colors ${
                                    isCaught ? 'bg-black/30 border-white/10' : 'bg-black/10 border-transparent opacity-60'
                                }` }
                            >
                                {/* Fish Icon / Placeholder */ }
                                <div
                                    className={ `w-8 h-8 rounded flex items-center justify-center text-lg bg-black/20 ${ isCaught ? '' : 'grayscale' }` }>
                                    { isCaught ? '🐟' : '❓' }
                                </div>

                                {/* Info */ }
                                <div className='flex-1 min-w-0 flex flex-col justify-center'>
                                    <div
                                        className={ `text-[10px] font-black uppercase leading-tight truncate ${ isCaught ? 'text-white' : 'text-zinc-500' }` }>
                                        { isCaught ? fish.name : 'Unknown Fish' }
                                    </div>
                                    <div className='text-[9px] text-zinc-500 font-mono leading-tight'>
                                        { isCaught ? (
                                            <>
                                                <span className='text-green-400'>x{ record.count }</span>
                                                <span className='mx-1.5 text-zinc-700'>|</span>
                                                <span>Max: { record.maxWeight }lb</span>
                                            </>
                                        ) : (
                                            <span>???</span>
                                        ) }
                                    </div>
                                </div>
                            </div>
                        );
                    }) }
                </div>
            </div>
        </GameHUD>
    );
};
