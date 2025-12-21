import { Routes, Route } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import Home from './Home';
import { useWidgets, type WidgetType } from './context/WidgetContext';
import FloatingWindow from './components/FloatingWindow';
import Synth from './components/Synth';
import Game from './components/Game';

/* -------------------------------------------------------------------------- */
/* HELPERS & UTILS                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Simple placeholder component for secondary routes.
 */
const PlaceholderPage = ({ title }: { title: string }) => (
    <div className='flex min-h-[60vh] items-center justify-center text-zinc-500 dark:text-zinc-400'>
        <h1 className='text-2xl font-semibold'>{ title } Page</h1>
    </div>
);

/**
 * Calculates the top-left coordinates required to center a fixed-size element.
 * @param w - Target width
 * @param h - Target height
 */
const getCenteredPos = (w: number, h: number) => {
    if (typeof window === 'undefined') return { x: 50, y: 50 };
    return {
        x: Math.max(0, (window.innerWidth - w) / 2),
        y: Math.max(0, (window.innerHeight - h) / 2)
    };
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The root Application component.
 * Manages high-level routing and the rendering of global floating widgets.
 */
export default function App() {
    const { isWidgetOpen, openWidget, closeWidget, activeWidgets, bringToFront } = useWidgets();

    // Local state to force re-centering calculations if the window size changes
    const [, setWindowSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // From 'main menu' button of Game -> re-open
    useEffect(() => {
        const shouldReopen = sessionStorage.getItem('reopen_game');
        if (shouldReopen === 'true') {
            sessionStorage.removeItem('reopen_game');
            openWidget('game');
        }
    }, [openWidget])

    // Widget Configurations
    const SYNTH_SIZE = { width: 1000, height: 400 };
    const GAME_SIZE = { width: 900, height: 750 };

    /**
     * Calculates z-index based on the widget's position in the active stack.
     * Higher index in activeWidgets array = higher z-index (closer to user).
     */
    const getZIndex = useCallback((id: WidgetType) => {
        const index = activeWidgets.indexOf(id);
        // Base z-index starts at 10 to clear standard page content
        return index === -1 ? 10 : 10 + index;
    }, [activeWidgets]);

    return (
        <div className='min-h-screen bg-page text-text-main transition-colors duration-300'>
            <Navbar/>

            {/* Main Content Routes */ }
            <main className='relative z-0'>
                <Routes>
                    <Route path='/' element={ <Home/> }/>
                    <Route path='/about' element={ <PlaceholderPage title='About'/> }/>
                    <Route path='/login' element={ <PlaceholderPage title='Login'/> }/>
                </Routes>
            </main>

            {/* Widget Overlays
                Widgets are rendered at the root level to avoid clipping and maintain a consistent z-index context
            */ }

            { isWidgetOpen('synth') && (
                <FloatingWindow
                    title='Synthesizer'
                    onClose={ () => closeWidget('synth') }
                    initialPosition={ getCenteredPos(SYNTH_SIZE.width, SYNTH_SIZE.height) }
                    initialSize={ SYNTH_SIZE }
                    zIndex={ getZIndex('synth') }
                    onFocus={ () => bringToFront('synth') }
                >
                    <Synth/>
                </FloatingWindow>
            ) }

            { isWidgetOpen('game') && (
                <FloatingWindow
                    title='erv world'
                    onClose={ () => closeWidget('game') }
                    initialPosition={ getCenteredPos(GAME_SIZE.width, GAME_SIZE.height) }
                    initialSize={ GAME_SIZE }
                    zIndex={ getZIndex('game') }
                    onFocus={ () => bringToFront('game') }
                >
                    <Game/>
                </FloatingWindow>
            ) }
        </div>
    );
}
