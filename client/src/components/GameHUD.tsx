import { useGameStore } from '../store/gameStore';
import { useTheme } from '../context/ThemeContext';
import { formatGameTime, formatSeasonName } from '../game/mechanics/TimeSystem';

export const GameHUD = () => {
    // 1. Transient Subscriptions
    // We fetch derived strings directly from the store selectors to avoid re-renders
    // on every frame, only re-rendering when the text output actually changes.
    const timeString = useGameStore((state) => formatGameTime(state.gameTime));
    const seasonString = useGameStore((state) => formatSeasonName(state.season));

    // 2. Context Subscription
    // Weather is stable enough to grab from Context (or Store, both work)
    const { weather } = useTheme();

    return (
        <div className="absolute top-0 w-full p-4 pointer-events-none flex justify-between items-start z-10">
            <div>
                <h1 className='text-2xl font-black text-primary tracking-widest uppercase opacity-80 drop-shadow-md'>
                    ERV World
                </h1>
                <div className='text-xs font-bold text-accent tracking-widest opacity-80 mt-1 uppercase'>
                    { seasonString }
                </div>
            </div>

            <div className='flex flex-col gap-2 items-end'>
                <div className='flex gap-2 text-muted font-mono text-xs'>
                    <span className='px-2 py-1 bg-black/40 backdrop-blur-md rounded border border-white/10'>
                        { timeString }
                    </span>
                    <span className='px-2 py-1 bg-black/40 backdrop-blur-md rounded border border-white/10 uppercase'>
                        { weather }
                    </span>
                </div>
                <div className='text-xs text-accent font-bold opacity-50'>
                    Press ESC for Menu
                </div>
            </div>
        </div>
    );
};
