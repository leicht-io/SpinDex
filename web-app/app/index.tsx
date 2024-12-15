import './core/styles/main.scss';
import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {BLEProvider, DataProvider} from './context';
import {Footer, TopBar} from './components';
import { Dashboard } from './routes';

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
