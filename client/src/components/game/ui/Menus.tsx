import { forwardRef, useState } from 'react';
import { FADE_IN_DURATION, FADE_OUT_DURATION } from '../GameConfig';

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

export const InteractionPrompt = forwardRef<HTMLDivElement, {}>((_, ref) => {
    return (
        <div
            ref={ ref }
            className='absolute bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-opacity duration-200 opacity-0'
        >
            <div className='bg-black/80 border-2 border-white px-4 py-2 shadow-[4px_4px_0_#000]'>
                <span className='text-white font-mono text-sm uppercase tracking-widest animate-pulse'>
                  <span id="prompt-text">[E] INTERACT</span>
                </span>
            </div>
        </div>
    );
});

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

export const MainMenu = ({ onHost, onJoin, onNameChange, name }: {
    onHost: () => void;
    onJoin: (id: string) => Promise<void>;
    onNameChange: (n: string) => void;
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
