import * as React from 'react';
import { render } from 'react-dom';
import { App } from './components/App';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './routes/dashboard';

const renderApp = () => {
    render(
        <React.Fragment>
            <App>
                <TopBar />

                <Sidebar />
                <Dashboard />
            </App>
        </React.Fragment>,
        document.getElementById('app')
    );
};

renderApp();

if ((module as any).hot) {
    (module as any).hot.accept(renderApp);
}
