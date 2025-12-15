import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './Home';
import { useWidgets } from './context/WidgetContext';
import FloatingWindow from './components/FloatingWindow';
import Synth from './components/Synth';

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className='flex min-h-[60vh] items-center justify-center text-zinc-500 dark:text-zinc-400'>
    <h1 className='text-2xl font-semibold'>{ title } Page</h1>
  </div>
);

export default function App() {
  const { isWidgetOpen, closeWidget } = useWidgets();

  return (
    <div className='min-h-screen bg-page text-text-main transition-colors duration-300'>
      <Navbar/>
      <Routes>
        <Route path='/' element={ <Home/> }/>
        <Route path='/about' element={ <PlaceholderPage title='About'/> }/>
        <Route path='/login' element={ <PlaceholderPage title='Login'/> }/>
      </Routes>

      { isWidgetOpen('synth') && (
        <FloatingWindow
          title='Synthesizer'
          onClose={ () => closeWidget('synth') }
          initialPosition={ { x: 50, y: 120 } }
          initialSize={ { width: 1000, height: 400 } }
        >
          <Synth/>
        </FloatingWindow>
      ) }
    </div>
  );
}
