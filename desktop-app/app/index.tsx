import * as React from 'react';
import {Sidebar} from './components/Sidebar';
import {TopBar} from './components/TopBar';
import './core/styles/main.scss';
import {Dashboard} from './routes/dashboard';
import {createRoot} from 'react-dom/client';
import {WSProvider} from "./context";
import {createTheme, ThemeProvider} from "@mui/material";

const renderApp = () => {
    const container = document.getElementById('app');
    const root = createRoot(container);

    const theme = createTheme({
        palette: {
            primary: {
                light: '#33ab9f',
                main: '#009688',
                dark: '#00695f',
                contrastText: '#fff',
            },
            secondary: {
                light: '#5393ff',
                main: '#2979ff',
                dark: '#1c54b2',
                contrastText: '#000',
            },
        },
    });

    root.render(
        <ThemeProvider theme={theme}>
            <WSProvider>
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
            </WSProvider>
        </ThemeProvider>
    );
};

renderApp();

if ((module as any).hot) {
    (module as any).hot.accept(renderApp);
}
