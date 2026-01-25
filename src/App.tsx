import type { Component } from 'solid-js';
import { Router, Route } from '@solidjs/router';

// Pages
import Home from './pages/Home';

// Applications
import DawApp from './apps/daw/DawApp';

/**
 * The root component of the application.
 * Handles top level routing between the Dashboard and specific Tools.
 */
const App: Component = () => {
    return (
        <Router>
            <Route path="/" component={Home} />
            <Route path="/daw" component={DawApp} />
        </Router>
    );
};

export default App;
