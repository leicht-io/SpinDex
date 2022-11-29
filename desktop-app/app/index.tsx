import * as React from 'react';
import {App} from './components/App';
import {Container} from './components/Container';
import {Footer} from './components/Footer';
import {Page} from './components/Page';
import {Sidebar} from './components/Sidebar';
import {TopBar} from './components/TopBar';
import './core/styles/main.scss';
import {Dashboard} from './routes/dashboard';
import {createRoot} from 'react-dom/client';

const renderApp = () => {
    const container = document.getElementById('app');
    const root = createRoot(container);

    root.render(
        <App>
            <TopBar/>

            <Container>
                <Sidebar/>
                <Page>
                    <Dashboard/>
                </Page>
                <Footer/>
            </Container>
        </App>
    );
};

renderApp();

if ((module as any).hot) {
    (module as any).hot.accept(renderApp);
}
