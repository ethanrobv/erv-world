import { useThemeColor } from '../../hooks/useThemeColor';
import { FADE_IN_DURATION, FADE_OUT_DURATION } from './GameConfig';
import { useState } from 'react';

/* -------------------------------------------------------------------------- */
/* EFFECTS & TRANSITIONS                                                      */
/* -------------------------------------------------------------------------- */

export const TransitionOverlay = ({ isActive }: { isActive: boolean }) => {
    const duration = isActive ? FADE_OUT_DURATION : FADE_IN_DURATION;

    return (
        <div style={ {
            position: 'absolute',
            inset: 0,
            backgroundColor: 'black',
            opacity: isActive ? 1 : 0,
            transition: `opacity ${ duration }ms ease-in-out`,
            pointerEvents: 'none',
            zIndex: 100
        } }/>
    );
};

/* -------------------------------------------------------------------------- */
/* GAMEPLAY HUD                                                               */
/* -------------------------------------------------------------------------- */

export const InteractionPrompt = ({ label }: { label: string | null }) => {
    if (!label) return null;
    return (
        <div style={ {
            position: 'absolute',
            bottom: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '1.2rem',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 20
        } }>
            [ E ] - { label }
        </div>
    );
};

export const SystemFeed = ({ messages }: { messages: Array<{ id: number, text: string }> }) => {
    return (
        <div className='absolute bottom-4 left-4 z-20 flex flex-col gap-2 pointer-events-none'>
            { messages.map((msg) => (
                <div key={ msg.id } className='animate-in fade-in slide-in-from-left-5 duration-300'>
                    <span
                        className='bg-black/50 backdrop-blur-sm px-3 py-1 rounded text-xs font-mono text-white/80 border-l-2 border-primary'>
                        { msg.text }
                    </span>
                </div>
            )) }
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* MENUS & FORMS                                                              */
/* -------------------------------------------------------------------------- */

export const MainMenu = ({ onHost, onJoin }: { onHost: () => void, onJoin: (id: string) => Promise<void> }) => {
    const [joinId, setJoinId] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const text = useThemeColor('--text-main');

    const handleJoinClick = async () => {
        if (!joinId || joinId.length < 6) return;

        setIsJoining(true);
        try {
            await onJoin(joinId);
        } catch (e) {
            console.error(e);
            setIsJoining(false);
        }
    };

    return (
        <div
            className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-page/90 backdrop-blur-md transition-all duration-500'>
            <div className='flex w-full max-w-sm flex-col gap-6 p-8'>
                <h1 className='text-center font-sans text-3xl font-bold tracking-tighter text-text-main'>
                    title name
                </h1>

                {/* Host Action */ }
                <button
                    onClick={ onHost }
                    disabled={ isJoining }
                    className='group relative flex items-center justify-center overflow-hidden rounded-lg bg-primary py-4 font-mono text-lg font-bold text-primary-fg transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none'
                >
                    <span className='relative z-10'>CREATE NEW ROOM</span>
                    <div
                        className='absolute inset-0 -translate-x-full bg-white/20 transition-transform group-hover:translate-x-0'/>
                </button>

                <div className='relative flex items-center gap-2'>
                    <div className='h-px flex-1 bg-border-base'/>
                    <span className='font-mono text-xs text-text-muted uppercase'>OR</span>
                    <div className='h-px flex-1 bg-border-base'/>
                </div>

                {/* Join Action */ }
                <div className='flex flex-col gap-3'>
                    <input
                        type='text'
                        value={ joinId }
                        onChange={ (e) => setJoinId(e.target.value.toUpperCase()) }
                        placeholder='ENTER ROOM CODE'
                        maxLength={ 6 }
                        disabled={ isJoining }
                        className='w-full rounded-lg border-2 border-border-base bg-surface p-4 text-center font-mono text-xl tracking-widest text-text-main focus:border-primary focus:outline-none transition-colors disabled:opacity-50'
                    />
                    <button
                        style={ { color: text } }
                        onClick={ handleJoinClick }
                        disabled={ joinId.length < 6 || isJoining }
                        className='w-full rounded-lg bg-surface-highlight py-3 font-mono font-semibold text-text-main hover:bg-border-base disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                    >
                        { isJoining ? 'CONNECTING...' : 'JOIN SESSION' }
                    </button>
                </div>

                <p className='text-center font-mono text-[10px] text-text-muted'>
                    WASD TO MOVE • [E] TO INTERACT
                </p>
            </div>
        </div>
    );
};

/* -------------------------------------------------------------------------- */
/* NETWORK STATUS HUD                                                         */
/* -------------------------------------------------------------------------- */

export const NetworkIndicator = ({ roomCode, isHost }: { roomCode: string | null, isHost: boolean }) => {
    if (!roomCode) return null;
    return (
        <div
            className='absolute top-4 left-4 z-20 flex items-center gap-3 rounded-full border border-border-base bg-surface/80 px-4 py-2 backdrop-blur-sm shadow-xl'>
            <div className={ `size-2 animate-pulse rounded-full ${ isHost ? 'bg-emerald-500' : 'bg-primary' }` }/>
            <span className='font-mono text-xs font-bold text-text-main uppercase tracking-tight'>
                { isHost ? 'Host' : 'Guest' }: <span className='text-primary'>{ roomCode }</span>
            </span>
        </div>
    );
};
