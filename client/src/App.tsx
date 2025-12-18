import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './Home';
import { useWidgets, type WidgetType } from './context/WidgetContext';
import FloatingWindow from './components/FloatingWindow';
import Synth from './components/Synth';
import Game from './components/Game';

/* -------------------------------------------------------------------------- */
/* HELPERS & UTILS                                                            */
/* -------------------------------------------------------------------------- */

const PlaceholderPage = ({ title }: { title: string }) => (
    <div className='flex min-h-[60vh] items-center justify-center text-zinc-500 dark:text-zinc-400'>
        <h1 className='text-2xl font-semibold'>{ title } Page</h1>
    </div>
);

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

export default function App() {
    const { isWidgetOpen, closeWidget, activeWidgets, bringToFront } = useWidgets();

    // Widget Configurations
    const SYNTH_SIZE = { width: 1000, height: 400 };
    const GAME_SIZE = { width: 900, height: 750 };

    const getZIndex = (id: WidgetType) => {
        const index = activeWidgets.indexOf(id);
        return index === -1 ? 10 : 10 + index;
    };

    return (
        <div className='min-h-screen bg-page text-text-main transition-colors duration-300'>
            <Navbar/>

            {/* Main Content Routes */ }
            <Routes>
                <Route path='/' element={ <Home/> }/>
                <Route path='/about' element={ <PlaceholderPage title='About'/> }/>
                <Route path='/login' element={ <PlaceholderPage title='Login'/> }/>
            </Routes>

            {/* Widget Overlays */ }
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
                    title='demo'
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
