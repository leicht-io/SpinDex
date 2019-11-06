import { createStyles, Divider, Drawer, List, ListItem, ListItemText, makeStyles, Theme } from '@material-ui/core';
import * as React from 'react';

export const drawerWidth = 360;

export const Sidebar = () => {
    const useStyles = makeStyles((theme: Theme) =>
        createStyles({
            root: {
                display: 'flex',
            },
            appBar: {
                zIndex: theme.zIndex.drawer + 1,
            },
            drawer: {
                width: drawerWidth,
                flexShrink: 0,
            },
            drawerPaper: {
                width: drawerWidth,
            },
            toolbar: theme.mixins.toolbar,
        }),
    );

    const classes = useStyles();

    return (
        <Drawer
            className={ classes.drawer }
            variant="permanent"
            classes={ {
                paper: classes.drawerPaper,
            } } >
            <div className={ classes.toolbar } />

        </Drawer>
    );
};
