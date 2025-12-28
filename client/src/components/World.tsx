import { useTheme } from '../context/ThemeContext';

/**
 * Container component for the game widget.
 */
const World = () => {
    const { time, weather } = useTheme();

    return (
        <div className='w-full h-full flex flex-col items-center justify-center min-h-[60vh]'>
            <div
                className='relative w-full max-w-4xl aspect-video border-4 border-accent rounded-xl bg-panel shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-500'>
                <h1 className='text-4xl font-black text-primary tracking-widest uppercase opacity-90'>
                    Game Canvas
                </h1>
                <div className='mt-4 flex gap-4 text-muted font-mono text-sm'>
          <span className='px-2 py-1 bg-black/5 rounded'>
            Time: <strong className='text-accent'>{ time }</strong>
          </span>
                    <span className='px-2 py-1 bg-black/5 rounded'>
            Weather: <strong className='text-accent'>{ weather }</strong>
          </span>
                </div>
            </div>
        </div>
    );
};

export default World;
