import { Grid, makeStyles, Paper } from '@material-ui/core';
import * as React from 'react';
import { HotSpotCard } from '../../components/HotSpotCard';
import { drawerWidth } from '../../components/Sidebar';

export const Dashboard = () => {
    const useStyles = makeStyles((theme) => ({
        paper: {
            padding: theme.spacing(2),
            textAlign: 'center',
            color: theme.palette.text.secondary,
        },
        content: {
            flexGrow: 1,
            marginLeft: drawerWidth,
            paddingTop: theme.spacing(3),
            paddingBottom: theme.spacing(3),
        },
        toolbar: theme.mixins.toolbar,
    }));

    const classes = useStyles();

    return (
        <main className={ classes.content }>
            <div className={ classes.toolbar } />
            <Paper className={ classes.paper }>
                <Grid container={ true }>
                    <HotSpotCard title="RPM" value="25" />
                    <HotSpotCard title="Temperature" value="30 C" />
                    <HotSpotCard title="Current" value="2.1 A" />
                    <HotSpotCard title="Voltage" value="12 V" />
                </Grid>
            </Paper>
        </main>
    );

};
