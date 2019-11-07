import { Grid, makeStyles, Paper } from '@material-ui/core';
import * as React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
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
        graph: {
            marginTop: theme.spacing(2),
            padding: theme.spacing(3)
        }
    }));

    const classes = useStyles();
    const data = [{name: 'Page A', uv: 400, pv: 2400, amt: 2400}];

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

            <Paper className={ classes.graph }>
                <ResponsiveContainer height={300} width="100%">
                    <LineChart data={ data }>
                        <Line type="monotone" dataKey="uv" stroke="#8884d8" />
                        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                        <XAxis dataKey="name" />
                        <YAxis />
                    </LineChart>
                </ResponsiveContainer>
            </Paper>
        </main>
    );

};
