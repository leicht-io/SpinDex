import * as React from 'react';
import './appshell.scss';
import { UIContext } from '../../context';
import { Compare, Measurement } from '../../routes';
import { DialogHost } from '../Dialogs';
import { MenuBar } from '../MenuBar';
import { Sidebar } from '../Sidebar';
import { StatusBar } from '../StatusBar';

export const AppShell = (): React.ReactElement => {
    const { viewMode } = React.useContext(UIContext);

    return (
        <>
            <MenuBar />
            <Sidebar />
            <main className={ 'app-main' }>
                {viewMode === 'compare' ? <Compare /> : <Measurement />}
            </main>
            <StatusBar />
            <DialogHost />
        </>
    );
};
