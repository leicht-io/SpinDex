import * as React from 'react';
import './core/styles/main.scss';
import { Dashboard } from './routes';
import { createRoot } from 'react-dom/client';
import { BLEProvider, DataProvider } from './context';
import { createTheme, ThemeProvider } from '@mui/material';
import { Sidebar, TopBar } from './components';

const renderApp = (): void => {
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

  const container: Element = document.getElementById('app') as Element;
  const root = createRoot(container);

  root.render(
    <ThemeProvider theme={ theme }>
      <DataProvider>
        <BLEProvider>
          <TopBar />

          <div
            style={ {
              marginTop: '48px',
              zIndex: 0,
              width: '100vw',
              height: 'calc(100vh - 48px)',
              padding: 0,
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              alignContent: 'stretch',
            } }>
            <Dashboard />
          </div>
        </BLEProvider>
      </DataProvider>
    </ThemeProvider>
  );
};

renderApp();

if ((module as any).hot) {
  (module as any).hot.accept(renderApp);
}
