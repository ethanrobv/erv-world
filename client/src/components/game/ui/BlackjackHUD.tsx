import { useState, useMemo } from 'react';
import type { Card, BJSeatState } from '../GameConfig';
import { calculateHand } from '../logic/Blackjack';
import { CardBack, PlayingCard } from '../assets';
import { useThemeColor } from "../../../hooks/useThemeColor";
import { GameHUD } from './GameHUD';

// TYPES
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
    gamePhase: string;
}

// SUB-COMPONENT: CasinoChip (Unchanged)
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
                <div className='absolute inset-0 rounded-full bg-black translate-y-[5px]'/>
                <div
                    style={ {
                        backgroundColor: colorVar,
                        boxShadow: isSelected ? '0 0 0 4px white' : 'none'
                    } }
                    className={ `
                        absolute inset-0 rounded-full border-[3px] border-black flex items-center justify-center
                        overflow-hidden 
                        ${ isSelected ? 'translate-y-0.5' : '-translate-y-px' } 
                        transition-all duration-200
                    ` }
                >
                    <div
                        className='absolute inset-0 rounded-full border-4 border-dashed border-black/15 pointer-events-none'/>
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
                    <div
                        className='w-9 h-9 rounded-full bg-white border-[3px] border-black flex items-center justify-center z-10 shadow-inner'>
                        <span className='text-black font-[1000] text-sm font-mono leading-none'>${ value }</span>
                    </div>
                </div>
            </button>
        </div>
    );
};

// MAIN COMPONENT
export const BlackjackHUD = ({
                                 seat,
                                 dealerHand,
                                 isMyTurn,
                                 onBet,
                                 onAction,
                                 onLeave,
                                 seatLabel,
                                 money,
                                 exitLabel,
                                 gamePhase
                             }: BlackjackHUDProps) => {
    const [selectedBet, setSelectedBet] = useState<number | null>(null);

    const handTotal = useMemo(() => calculateHand(seat.hand.filter(Boolean)), [seat?.hand]);
    const dealerTotal = useMemo(() => dealerHand ? calculateHand(dealerHand.filter(Boolean)) : 0, [dealerHand]);

    const isRoundActive = gamePhase !== 'betting' && gamePhase !== 'idle';

    // Theme Colors
    const c10 = useThemeColor('--game-casino-chip-10');
    const c25 = useThemeColor('--game-casino-chip-25');
    const c50 = useThemeColor('--game-casino-chip-50');
    const c100 = useThemeColor('--game-casino-chip-100');

    const chipColors: Record<number, string> = { 10: c10, 25: c25, 50: c50, 100: c100 };

    if (!seat) return null;

    return (
        <GameHUD
            title="Blackjack"
            iconColorClass="bg-green-500"
            money={ money }
            seatLabel={ seatLabel }
            onLeave={ onLeave }
            initialPos={ { x: 25, y: 50 } }
            footerRight={ `[E] ${ exitLabel || 'LEAVE' }` }
            confirmLeaveText="LEAVE TABLE?"
        >
            { seat.status !== 'betting' ? (
                <div className='flex flex-col gap-4 bg-black/40 p-3 border-2 border-white/5'>
                    {/* Dealer Area */ }
                    <div className='flex justify-between items-center mb-4'>
                        <div className='flex gap-1'>
                            { (dealerHand || []).map((card, i) => (
                                <div key={ `dealer-${ i }` } className='w-8 h-12 shadow-sm'>
                                    { !card.isHidden ? <PlayingCard card={ card } fontSize='10px'/> : <CardBack/> }
                                </div>
                            )) }
                        </div>
                        <div className='text-right'>
                            <span className='text-[8px] text-zinc-500 block font-bold uppercase'>DEALER</span>
                            <span className='text-xl font-black text-white leading-none'>{ dealerTotal }</span>
                        </div>
                    </div>

                    {/* Player Area */ }
                    <div className='flex justify-between items-center border-t border-white/10 pt-4'>
                        <div className='flex gap-1'>
                            { (seat.hand || []).map((card, i) => (
                                <div key={ `player-${ i }` } className='w-8 h-12 shadow-sm'>
                                    { !card.isHidden ? <PlayingCard card={ card } fontSize='10px'/> : <CardBack/> }
                                </div>
                            )) }
                        </div>
                        <div className='text-right'>
                            <span className='text-[8px] text-zinc-500 block font-bold uppercase'>PLAYER</span>
                            <span className='text-xl font-black text-white leading-none'>{ handTotal }</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className='flex flex-col items-center gap-4 py-3 bg-black/20 border-2 border-white/5 w-full'>
                    <span className='text-[9px] text-zinc-500 font-black uppercase tracking-widest'>
                        { isRoundActive ? 'ROUND IN PROGRESS' : 'CHOOSE BET AMOUNT' }
                    </span>
                    <div className='flex flex-row justify-around items-center w-full px-6'>
                        { [10, 25, 50, 100].map((val) => (
                            <CasinoChip
                                key={ val }
                                value={ val }
                                colorVar={ chipColors[val] }
                                isSelected={ selectedBet === val }
                                onClick={ () => setSelectedBet(val) }
                                disabled={ money < val || isRoundActive }
                            />
                        )) }
                    </div>
                </div>
            ) }

            <div className='shrink-0 h-10'>
                { seat.status === 'betting' && (
                    <button
                        onClick={ () => selectedBet && onBet(selectedBet) }
                        disabled={ !selectedBet || isRoundActive }
                        style={ {
                            backgroundColor: (selectedBet && !isRoundActive) ? 'var(--brand-primary)' : 'var(--bg-page)',
                            color: (selectedBet && !isRoundActive) ? 'var(--brand-primary)' : 'var(--text-muted)'
                        } }
                        className={ `w-full h-full border-4 border-black uppercase text-sm transition-all font-mono ${ (selectedBet && !isRoundActive) ? 'cursor-pointer hover:brightness-110' : 'cursor-not-allowed opacity-50' }` }
                    >
                        <span style={ { filter: (selectedBet && !isRoundActive) ? 'invert(1)' : 'invert(0)' } }>
                            { isRoundActive ? 'WAITING FOR ROUND...' : (selectedBet ? `PLACE BET $${ selectedBet }` : 'SELECT A CHIP') }
                        </span>
                    </button>
                ) }
                { isMyTurn && seat.status === 'playing' && (
                    <div className='flex gap-2 h-full'>
                        <button onClick={ () => onAction('hit') }
                                className='flex-1 bg-white text-black font-black border-2 border-black text-xs uppercase hover:bg-zinc-100'>Hit
                        </button>
                        <button onClick={ () => onAction('stand') } style={ {
                            backgroundColor: 'var(--brand-primary)',
                            color: 'var(--brand-primary)'
                        } } className='flex-1 border-2 border-white text-xs uppercase hover:brightness-110'>
                            <span style={ { filter: 'invert(1)' } }>Stand</span>
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
        </GameHUD>
    );
};
