import * as React from 'react';
import { render } from 'react-dom';

import WebFont from 'webfontloader';
import { App } from './components/App';
import { Container } from './components/Container';
import { Footer } from './components/Footer';
import { Page } from './components/Page';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Dashboard } from './routes/dashboard';

WebFont.load({
    google: {
        families: ['Open-Sans Web:300,400,700', 'sans-serif']
    }
});

const renderApp = () => {
    render(
        <React.Fragment>
            <App>
                <TopBar />

                <Container>
                    <Sidebar />
                    <Page>
                        <Dashboard />
                    </Page>
                    <Footer />
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
