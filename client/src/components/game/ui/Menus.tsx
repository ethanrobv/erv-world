import { forwardRef, memo, useEffect, useState } from 'react';
import { FADE_IN_DURATION, FADE_OUT_DURATION } from '../GameConfig';

// TYPES

interface MainMenuProps {
    onHost: () => void;
    onJoin: (id: string) => Promise<void>;
    onNameChange: (n: string) => void;
    name: string;
}

interface EscOverlayMenuProps {
    onResume: () => void;
    onMainMenu: () => void;
}

interface NetworkIndicatorProps {
    roomCode: string | null;
    isHost: boolean;
    ping?: number;
}

// COMPONENTS

/**
 * A full-screen overlay used for fading between scenes or states.
 * Controlled by the `isActive` prop to determine if the screen is black (active) or clear.
 */
export const TransitionOverlay = ({ isActive }: { isActive: boolean }) => {
    const duration = isActive ? FADE_OUT_DURATION : FADE_IN_DURATION;
    return (
        <div
            style={ {
                position: 'absolute',
                inset: 0,
                backgroundColor: '#000000',
                opacity: isActive ? 1 : 0,
                transition: `opacity ${ duration }ms ease-in-out`,
                pointerEvents: 'none',
                // Using z-100 per your request (requires tailwind config extension)
                zIndex: 100
            } }
            className='z-100'
        />
    );
};

/**
 * A HUD element that prompts the user to interact with an object (e.g., '[E] INTERACT').
 * Uses forwardRef to allow direct DOM manipulation for high-frequency updates.
 */
export const InteractionPrompt = memo(forwardRef<HTMLDivElement, {}>((_, ref) => {
    return (
        <div
            ref={ ref }
            className='absolute bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-opacity duration-200 opacity-0'
        >
            <div className='bg-black/80 border-2 border-white px-4 py-2 shadow-[4px_4px_0_#000]'>
                <span className='text-white font-mono text-sm uppercase tracking-widest animate-pulse'>
                    <span id='prompt-text'>[E] INTERACT</span>
                </span>
            </div>
        </div>
    );
}));

/**
 * Displays a list of transient system messages.
 * Note: Positioning is handled by the parent container in Game.tsx to ensure high Z-index.
 */
export const SystemFeed = ({ messages }: { messages: Array<{ id: number; text: string }> }) => (
    <div className='flex flex-col gap-1 items-start font-mono pointer-events-none'>
        { messages.map((msg) => (
            <div
                key={ msg.id }
                className='bg-black/80 px-3 py-1 text-xs text-white border-l-2 border-primary animate-in fade-in duration-300'
            >
                { msg.text }
            </div>
        )) }
    </div>
);

/**
 * The initial landing screen for the game.
 * Allows users to set their name, host a new game, or join an existing session via code or list.
 */
export const MainMenu = ({ onHost, onJoin, onNameChange, name }: MainMenuProps) => {
    const [joinId, setJoinId] = useState('');
    const [lobbies, setLobbies] = useState<Array<{ code: string; age: number }>>([]);
    const [isLoadingLobbies, setIsLoadingLobbies] = useState(false);

    // Fetch available lobbies on mount
    useEffect(() => {
        let isMounted = true;

        const fetchLobbies = async () => {
            setIsLoadingLobbies(true);
            try {
                const res = await fetch('/api/game/rooms');
                if (res.ok && isMounted) {
                    const data = await res.json();
                    setLobbies(data.rooms);
                }
            } catch (e) {
                console.error('Failed to fetch lobbies', e);
            } finally {
                if (isMounted) setIsLoadingLobbies(false);
            }
        };

        // Fix: Explicitly mark the promise as ignored/handled with void operator
        void fetchLobbies();

        return () => {
            isMounted = false;
        };
    }, []);

    const formatTime = (ms: number) => {
        const mins = Math.floor(ms / 60000);
        return `${ mins }m ago`;
    };

    return (
        <div className='absolute inset-0 flex items-center justify-center bg-zinc-900 z-50 font-mono'>
            <div className='w-full max-w-sm p-8 border border-zinc-700 bg-black flex flex-col gap-8 shadow-2xl'>

                {/* Header Input Section */ }
                <div className='space-y-4'>
                    <input
                        value={ name }
                        onChange={ (e) => onNameChange(e.target.value.toUpperCase()) }
                        placeholder='ENTER NAME'
                        className='w-full bg-zinc-900 border border-zinc-700 px-4 py-3 text-white text-center focus:outline-none focus:border-white mb-4 transition-colors'
                        maxLength={ 12 }
                    />

                    <button
                        onClick={ onHost }
                        className='w-full py-3 bg-white text-black font-bold hover:bg-zinc-200 transition-colors tracking-wider'
                    >
                        CREATE INSTANCE
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
                            className='px-4 border border-white text-white hover:bg-white/10 font-bold'
                        >
                            JOIN
                        </button>
                    </div>
                </div>

                {/* Lobby Browser Section */ }
                <div className='border-t border-zinc-800 pt-6'>
                    <div className='flex justify-between items-center mb-3'>
                        <h3 className='text-zinc-400 text-xs tracking-widest uppercase'>Active Signals:</h3>
                        { isLoadingLobbies && (
                            <span className='text-[10px] text-zinc-600 animate-pulse'>SCANNING...</span>
                        ) }
                    </div>

                    <div className='h-32 overflow-y-auto border border-zinc-800 bg-zinc-900/50 p-1 custom-scrollbar'>
                        { lobbies.length === 0 && !isLoadingLobbies ? (
                            <div className='h-full flex items-center justify-center text-[10px] text-zinc-600 italic'>
                                NO AVAILABLE INSTANCES
                            </div>
                        ) : (
                            <div className='flex flex-col gap-1'>
                                { lobbies.map((lobby) => (
                                    <button
                                        key={ lobby.code }
                                        onClick={ () => onJoin(lobby.code) }
                                        className='flex justify-between items-center px-3 py-2 bg-black border border-zinc-800 hover:border-white hover:bg-zinc-800 transition-all text-left group'
                                    >
                                        <span className='text-white text-xs font-bold group-hover:text-primary'>
                                            { lobby.code }
                                        </span>
                                        <span className='text-[9px] text-zinc-500'>
                                            { formatTime(lobby.age) }
                                        </span>
                                    </button>
                                )) }
                            </div>
                        ) }
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * An overlay menu displayed when the player presses esc.
 */
export const EscOverlayMenu = ({ onResume, onMainMenu }: EscOverlayMenuProps) => {
    return (
        <div className='absolute inset-0 flex items-center justify-center bg-black/80 z-100 backdrop-blur-sm'>
            <div className='flex flex-col gap-4 p-8 border border-white/20 bg-black min-w-[300px] shadow-2xl'>
                <button
                    onClick={ onResume }
                    className='py-3 bg-white text-black font-mono font-bold hover:bg-gray-200 transition-colors'
                >
                    RESUME
                </button>
                <button
                    onClick={ onMainMenu }
                    className='py-3 bg-red-950/30 text-red-200 font-mono font-bold border border-red-900 hover:bg-red-900/50 transition-colors'
                >
                    DISCONNECT
                </button>
            </div>
        </div>
    );
};

/**
 * Top-left HUD indicator showing the current room code and network latency.
 */
export const NetworkIndicator = ({ roomCode, isHost, ping }: NetworkIndicatorProps) => {
    if (!roomCode) return null;
    return (
        <div className='absolute top-4 left-4 z-40 flex items-center gap-2'>
            {/* Role & Room Code */ }
            <div
                className='px-3 py-1 bg-black/80 backdrop-blur border border-white/10 flex items-center gap-2 font-mono text-xs text-zinc-400 shadow-sm'>
                <div
                    className={ `w-2 h-2 rounded-full ${ isHost ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' }` }/>
                <span>
                    { isHost ? 'HOST' : 'CLIENT' }: <span
                    className='text-white font-bold tracking-wider'>{ roomCode }</span>
                </span>
            </div>

            {/* Latency (Client Only) */ }
            { !isHost && ping !== undefined && (
                <div
                    className='px-3 py-1 bg-black/80 backdrop-blur border border-white/10 flex items-center gap-2 font-mono text-xs text-zinc-400 shadow-sm'>
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
