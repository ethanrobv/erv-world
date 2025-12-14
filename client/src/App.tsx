import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './Home';
import { useWidgets } from './context/WidgetContext'; // Removed .tsx extension (standard practice)
import FloatingWindow from './components/FloatingWindow';
import Synth from './components/Synth';

const PlaceholderPage = ({ title }: { title: string }) => (
    <div className='flex min-h-[60vh] items-center justify-center text-zinc-500 dark:text-zinc-400'>
        <h1 className='text-2xl font-semibold'>{title} Page</h1>
    </div>
);

export default function App() {
    // 1. Destructure the new helper and the close function
    const { isWidgetOpen, closeWidget } = useWidgets();

    return (
        <div className='min-h-screen bg-page text-text-main transition-colors duration-300'>
            <Navbar />
            <Routes>
                <Route path='/' element={<Home />} />
                <Route path='/about' element={<PlaceholderPage title='About' />} />
                <Route path='/login' element={<PlaceholderPage title='Login' />} />
            </Routes>

            {/* 2. Check if 'synth' is in the active array */}
            {isWidgetOpen('synth') && (
                <FloatingWindow
                    title='Synthesizer'
                    // 3. You must pass an arrow function to close this SPECIFIC widget
                    onClose={() => closeWidget('synth')}
                    initialPosition={{ x: 50, y: 120 }}
                    initialSize={{ width: 1000, height: 400}}
                >
                    <Synth />
                </FloatingWindow>
            )}
        </div>
    );
}
