import * as React from 'react';
import './appshell.scss';
import { UIContext } from '../../context';
import { Compare, Measurement } from '../../routes';
import { DialogHost } from '../Dialogs';
import { MenuBar } from '../MenuBar';
import { Sidebar } from '../Sidebar';

export const AppShell = (): React.ReactElement => {
    const { viewMode, sidebarOpen } = React.useContext(UIContext);

    return (
        <>
            <MenuBar />
            <Sidebar />
            <main className={ `app-main ${ sidebarOpen ? 'with-sidebar' : '' }` }>
                {viewMode === 'compare' ? <Compare /> : <Measurement />}
            </main>
            <DialogHost />
        </>
    );
};
