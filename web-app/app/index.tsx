// Self-hosted (Latin subset only) instead of the Google Fonts stylesheet, which
// was a render-blocking request to a second origin before the font could load.
import '@fontsource/roboto/latin-300.css';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-500.css';
import '@fontsource/roboto/latin-700.css';
import './core/styles/main.scss';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { BLEProvider, TrackingProvider, UIProvider } from './context';
import { AppShell } from './components';

const renderApp = (): void => {
    const container: Element = document.getElementById('app') as Element;
    const root = createRoot(container);

    root.render(
        <TrackingProvider>
            <BLEProvider>
                <UIProvider>
                    <AppShell />
                </UIProvider>
            </BLEProvider>
        </TrackingProvider>
    );
};

renderApp();

if ((module as any).hot) {
    (module as any).hot.accept(renderApp);
}
