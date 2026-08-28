import './core/styles/main.scss';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {BLEProvider, TrackingProvider} from './context';
import {TopBar} from './components';
import { Dashboard } from './routes';

const renderApp = (): void => {
    const container: Element = document.getElementById('app') as Element;
    const root = createRoot(container);

    root.render(
            <TrackingProvider>
                <BLEProvider>
                    <TopBar/>
                    <Dashboard/>
                </BLEProvider>
            </TrackingProvider>
    );
};

renderApp();

if ((module as any).hot) {
    (module as any).hot.accept(renderApp);
}
