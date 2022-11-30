import * as React from 'react';
import {Footer} from './components/Footer';
import {Sidebar} from './components/Sidebar';
import {TopBar} from './components/TopBar';
import './core/styles/main.scss';
import {Dashboard} from './routes/dashboard';
import {createRoot} from 'react-dom/client';

const renderApp = () => {
    const container = document.getElementById('app');
    const root = createRoot(container);

    root.render(
        <>
            <TopBar/>

            <div
                style={{
                    marginTop: "48px",
                    zIndex: 0,
                    width: "100vw",
                    padding: 0,
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "stretch",
                    alignContent: "stretch",
                }}>
                <Sidebar/>
                <Dashboard/>
            </div>

            <Footer/>
        </>
    );
};

renderApp();

if ((module as any).hot) {
    (module as any).hot.accept(renderApp);
}
