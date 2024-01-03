import './core/styles/main.scss';
import * as React from 'react';
import {Dashboard} from './routes';
import {createRoot} from 'react-dom/client';
import {BLEProvider, DataProvider} from './context';
import {Footer, TopBar} from './components';

const renderApp = (): void => {
    const container: Element = document.getElementById('app') as Element;
    const root = createRoot(container);

    root.render(
            <DataProvider>
                <BLEProvider>
                    <TopBar/>
                    <Dashboard/>
                    <Footer/>
                </BLEProvider>
            </DataProvider>
    );
};

renderApp();

if ((module as any).hot) {
    (module as any).hot.accept(renderApp);
}
