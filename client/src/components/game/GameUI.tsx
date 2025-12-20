import { FADE_IN_DURATION, FADE_OUT_DURATION, type Card, type BJSeatState } from './GameConfig';
import { calculateHand } from './logic/Blackjack';
import { useState, useEffect } from 'react';

/* -------------------------------------------------------------------------- */
/* EFFECTS & TRANSITIONS                                                      */
/* -------------------------------------------------------------------------- */

export const TransitionOverlay = ({ isActive }: { isActive: boolean }) => {
    const duration = isActive ? FADE_OUT_DURATION : FADE_IN_DURATION;
    return (
        <div style={ {
            position: 'absolute', inset: 0, backgroundColor: '#000',
            opacity: isActive ? 1 : 0, transition: `opacity ${ duration }ms ease-in-out`,
            pointerEvents: 'none', zIndex: 100
        } }/>
    );
};

export const InteractionPrompt = ({ label }: { label: string | null }) => {
    if (!label) return null;
    return (
        <div
            className='absolute bottom-64 left-1/2 -translate-x-1/2 px-4 py-2 bg-black text-white font-mono text-sm border border-white/20 pointer-events-none z-20'>
            [E] { label.toUpperCase() }
        </div>
    );
};

export const SystemFeed = ({ messages }: { messages: Array<{ id: number, text: string }> }) => (
    <div className='absolute top-4 right-4 z-50 flex flex-col gap-1 items-end pointer-events-none font-mono'>
        { messages.map((msg) => (
            <div key={ msg.id }
                 className='bg-black/80 px-3 py-1 text-xs text-white border-r-2 border-primary'>
                { msg.text }
            </div>
        )) }
    </div>
);

// ... (CasinoChip and Card2D components remain unchanged from previous step)
// [!code change] 3D Chip with dynamic CSS variables
const CasinoChip = ({ value, colorVar, isSelected, onClick, disabled }: any) => {
    return (
        <button
            onClick={ onClick }
            disabled={ disabled }
            style={{ backgroundColor: `var(${colorVar})` }}
            className={ `
                relative w-16 h-16 rounded-full flex items-center justify-center 
                font-mono font-bold text-sm tracking-tighter text-white
                transition-all duration-100 ease-out select-none
                ${ disabled ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:brightness-110 active:scale-95' }
                ${ isSelected ? '-translate-y-3 shadow-2xl ring-4 ring-white/50 z-10' : 'shadow-[0_4px_6px_rgba(0,0,0,0.4),inset_0_-4px_4px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.3)]' }
                border-[4px] border-dashed border-white/20
            ` }
        >
            {/* Inner bevel for 3D feel */}
            <div className='absolute inset-1 rounded-full border-2 border-black/10 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]'>
                {/* Center Value with Shadow for contrast */}
                <div className='relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'>
                    ${ value }
                </div>
            </div>
        </button>
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
    )
};

export const BlackjackHUD = ({
                                 seat, dealerHand, isMyTurn, onBet, onAction, onLeave, seatLabel, money, exitLabel
                             }: {
    seat: BJSeatState, dealerHand: Card[], isMyTurn: boolean,
    onBet: (amt: number) => void, onAction: (act: 'hit' | 'stand') => void, onLeave: () => void,
    seatLabel?: string | null,
    money: number,
    exitLabel?: string | null
}) => {
    const [selectedBet, setSelectedBet] = useState<number | null>(null);
    const [confirmLeave, setConfirmLeave] = useState(false);

    const handTotal = calculateHand(seat.hand);
    const dealerTotal = calculateHand(dealerHand);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyE') {
                e.stopPropagation();

                if (confirmLeave) {
                    onLeave();
                } else {
                    setConfirmLeave(true);
                }
            } else {
                if (confirmLeave) setConfirmLeave(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [confirmLeave, onLeave]);

    // ... (HUD Render logic mostly same, just ensuring variables are correct)
    return (
        <>
            {/* Confirmation Dialog */ }
            { confirmLeave && (
                <div
                    className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 bg-black/90 border border-white text-white font-mono text-center z-50 shadow-2xl animate-in zoom-in duration-200'>
                    <div className='text-xl font-bold mb-2'>LEAVING TABLE?</div>
                    <div className='text-sm text-zinc-400'>PRESS <span className='text-white font-bold'>E</span> AGAIN
                        TO CONFIRM
                    </div>
                    <div className='text-xs text-zinc-600 mt-2'>PRESS ANY OTHER KEY TO CANCEL</div>
                </div>
            ) }

            <div
                className='absolute inset-x-0 bottom-0 h-[25%] bg-zinc-900 border-t border-white/10 flex items-center justify-between px-8 z-30 font-mono text-white select-none'>

                {/* Seat Label & Money - Top Right */ }
                <div className='absolute top-4 right-8 flex flex-col items-end opacity-90 gap-1'>
                    { seatLabel && (
                        <div className='flex flex-col items-end'>
                            <span className='text-[10px] uppercase text-zinc-500 tracking-widest'>SEATED AT</span>
                            <span className='text-lg font-bold text-white font-mono border-b border-zinc-700 pb-1'>{ seatLabel.toUpperCase() }</span>
                        </div>
                    )}
                    <div className='text-xl font-mono font-bold text-green-400 drop-shadow-md'>
                        ${ money }
                    </div>
                    {/* Exit Prompt inside HUD */ }
                    { exitLabel && (
                        <div className='mt-2 text-xs text-zinc-400 border border-zinc-700 px-2 py-1 rounded bg-black/40'>
                            [E] { exitLabel.toUpperCase() }
                        </div>
                    )}
                </div>

                {/* LEFT: DEALER INFO */ }
                <div className='flex flex-col gap-2 w-1/4'>
                    <div className='text-xs text-zinc-500 uppercase tracking-widest'>Dealer</div>
                    <div className='flex gap-2 items-center'>
                        <div className='flex gap-1'>
                            { dealerHand.map((c, i) => <Card2D key={ i } card={ c }/>) }
                            { dealerHand.length === 0 &&
                                <div className='w-10 h-14 border border-dashed border-zinc-700 rounded-sm'/> }
                        </div>
                        { dealerHand.length > 0 &&
                            <span className='text-xl font-bold text-zinc-400'>{ dealerTotal }</span> }
                    </div>
                </div>

                {/* CENTER: PLAYER HAND & CONTROLS */ }
                <div className='flex flex-col items-center gap-2 flex-1'>
                    {/* STATUS TEXT */ }
                    { ['won', 'lost', 'bust', 'push', 'blackjack'].includes(seat.status) && (
                        <div
                            className='absolute -top-12 px-6 py-2 bg-black border border-white text-xl font-bold animate-bounce'>
                            { seat.status.toUpperCase() }!
                        </div>
                    ) }

                    {/* BETTING CONTROLS */ }
                    { seat.status === 'betting' && (
                        <div className='flex flex-col items-center gap-3'>
                            <div className='text-xs text-zinc-400'>SELECT BET</div>
                            <div className='flex gap-4'>
                                <CasinoChip
                                    value={ 10 }
                                    colorVar='--game-wood'
                                    isSelected={ selectedBet === 10 }
                                    onClick={ () => setSelectedBet(10) }
                                    disabled={money < 10}
                                />
                                <CasinoChip
                                    value={ 25 }
                                    colorVar='--game-shirt-smoker'
                                    isSelected={ selectedBet === 25 }
                                    onClick={ () => setSelectedBet(25) }
                                    disabled={money < 25}
                                />
                                <CasinoChip
                                    value={ 50 }
                                    colorVar='--game-metal'
                                    isSelected={ selectedBet === 50 }
                                    onClick={ () => setSelectedBet(50) }
                                    disabled={money < 50}
                                />
                                <CasinoChip
                                    value={ 100 }
                                    colorVar='--brand-primary'
                                    isSelected={ selectedBet === 100 }
                                    onClick={ () => setSelectedBet(100) }
                                    disabled={money < 100}
                                />
                            </div>
                            { selectedBet && (
                                <button onClick={ () => onBet(selectedBet) }
                                        className='mt-1 px-12 py-2 bg-primary hover:opacity-90 text-primary-fg font-bold text-md rounded-full shadow-[0_4px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest'>
                                    PLACE BET ${ selectedBet }
                                </button>
                            ) }
                        </div>
                    ) }

                    {/* PLAYING CONTROLS */ }
                    { (seat.status === 'playing' || seat.status === 'stand' || seat.status === 'bust' || seat.status === 'won' || seat.status === 'lost') && (
                        <div className='flex flex-col items-center gap-2'>
                            <div className='flex gap-2 items-center'>
                                <div className='flex gap-1'>
                                    { seat.hand.map((c, i) => <Card2D key={ i } card={ c }/>) }
                                </div>
                                <span className='text-2xl font-bold text-primary'>{ handTotal }</span>
                            </div>

                            { isMyTurn && seat.status === 'playing' && (
                                <div className='flex gap-4 mt-2'>
                                    <button onClick={ () => onAction('hit') }
                                            className='px-8 py-2 bg-surface text-text-main font-bold hover:bg-surface-highlight border-b-4 border-border-base active:border-b-0 active:translate-y-1 rounded transition-all'>HIT
                                    </button>
                                    <button onClick={ () => onAction('stand') }
                                            className='px-8 py-2 bg-red-900 text-white font-bold hover:bg-red-800 border-b-4 border-red-950 active:border-b-0 active:translate-y-1 rounded transition-all'>STAND
                                    </button>
                                </div>
                            ) }
                            { !isMyTurn && seat.status === 'playing' &&
                                <div className='text-xs text-zinc-500 animate-pulse'>WAITING FOR TURN...</div> }
                        </div>
                    ) }
                </div>

                <div className='w-1/4 flex justify-end items-end h-full pb-4'>
                </div>
            </div>
        </>
    );
};

// [!code change] Added onNameChange prop
export const MainMenu = ({ onHost, onJoin, onNameChange, name }: {
    onHost: () => void,
    onJoin: (id: string) => Promise<void>,
    onNameChange: (n: string) => void,
    name: string
}) => {
    const [joinId, setJoinId] = useState('');

    return (
        <div className='absolute inset-0 flex items-center justify-center bg-zinc-900 z-50 font-mono'>
            <div className='w-full max-w-sm p-8 border border-zinc-700 bg-black'>
                <h1 className='text-3xl font-bold text-center text-white mb-8 tracking-widest'>
                    erv world
                </h1>

                <div className='space-y-4'>
                    {/* [!code change] Name Input */}
                    <input
                        value={ name } onChange={ (e) => onNameChange(e.target.value.toUpperCase()) }
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
                            value={ joinId } onChange={ (e) => setJoinId(e.target.value.toUpperCase()) }
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

// [!code change] Pause Menu
export const PauseMenu = ({ onResume, onMainMenu }: { onResume: () => void, onMainMenu: () => void }) => {
    return (
        <div className='absolute inset-0 flex items-center justify-center bg-black/80 z-[100] backdrop-blur-sm'>
            <div className='flex flex-col gap-4 p-8 border border-white/20 bg-black min-w-[300px]'>
                <h2 className='text-2xl text-white font-mono text-center mb-4 tracking-widest'>PAUSED</h2>
                <button
                    onClick={onResume}
                    className='py-3 bg-white text-black font-mono font-bold hover:bg-gray-200'
                >
                    RESUME
                </button>
                <button
                    onClick={onMainMenu}
                    className='py-3 bg-red-900/50 text-red-200 font-mono font-bold border border-red-900 hover:bg-red-900/80'
                >
                    MAIN MENU
                </button>
            </div>
        </div>
    );
};

export const NetworkIndicator = ({ roomCode, isHost, ping }: { roomCode: string | null, isHost: boolean, ping?: number }) => {
    if (!roomCode) return null;
    return (
        <div className='absolute top-4 left-4 z-40 flex items-center gap-2'>
            <div className='px-3 py-1 bg-black/50 backdrop-blur border border-white/10 flex items-center gap-2 font-mono text-xs text-zinc-400 rounded-full shadow-sm'>
                <div className={ `w-2 h-2 rounded-full ${ isHost ? 'bg-green-500' : 'bg-blue-500' }` }/>
                <span>{ isHost ? 'HOST' : 'CLIENT' }: <span className='text-white'>{ roomCode }</span></span>
            </div>

            { !isHost && ping !== undefined && (
                <div className='px-3 py-1 bg-black/50 backdrop-blur border border-white/10 flex items-center gap-2 font-mono text-xs text-zinc-400 rounded-full shadow-sm'>
                    <span className='tracking-wider'>PING: <span className={ping < 100 ? 'text-green-400' : ping < 200 ? 'text-yellow-400' : 'text-red-400'}>{ping}ms</span></span>
                </div>
            )}
        </div>
    );
};
