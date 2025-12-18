import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

/* -------------------------------------------------------------------------- */
/* APP & PROVIDERS                                                            */
/* -------------------------------------------------------------------------- */

import App from './App';
import { WidgetProvider } from './components/WidgetProvider';
import { NetworkProvider } from './components/NetworkProvider';

/* -------------------------------------------------------------------------- */
/* APP ENTRY POINT                                                            */
/* -------------------------------------------------------------------------- */

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <NetworkProvider>
                <WidgetProvider>
                    <App/>
                </WidgetProvider>
            </NetworkProvider>
        </BrowserRouter>
    </StrictMode>
);
