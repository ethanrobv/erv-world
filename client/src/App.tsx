import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import World from './components/World';

/**
 * Application entry point handling global layout and routing.
 */
function App() {
    return (
        <Router>
            <div className='min-h-screen flex flex-col bg-main transition-colors duration-500'>
                <Navbar/>
                <main className='flex-grow container mx-auto px-4 py-6 relative'>
                    <Routes>
                        <Route path='/' element={ <World/> }/>
                        <Route path='/world' element={ <World/> }/>
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
