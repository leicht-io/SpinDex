import { AppBar, createStyles, makeStyles, Theme, Toolbar, Typography } from '@material-ui/core';
import * as React from 'react';

export const TopBar = () => {
    const useStyles = makeStyles((theme: Theme) =>
        createStyles({
            appBar: {
                zIndex: theme.zIndex.drawer + 1,
            }
        }),
    );

    const classes = useStyles();

    return (
        <AppBar position="fixed" className={ classes.appBar }>
            <Toolbar>
                <Typography variant="h6" noWrap={ true }>
                    Astraeus
                </Typography>
            </Toolbar>
        </AppBar>
    );
};
