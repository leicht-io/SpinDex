import { Container, CssBaseline } from '@material-ui/core';
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
                <CssBaseline />
                <TopBar />

                <Container maxWidth={false}>
                    <Sidebar />
                    <Dashboard />
                </Container>
            </App>
        </React.Fragment>,
        document.getElementById('app')
    );
};

renderApp();

if ((module as any).hot) {
    (module as any).hot.accept(renderApp);
}
