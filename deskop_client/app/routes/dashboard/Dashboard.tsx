import {Grid, makeStyles, Paper} from '@material-ui/core';
import * as React from 'react';
import {CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis} from 'recharts';
import {HotSpotCard} from '../../components/HotSpotCard';
import {drawerWidth} from '../../components/Sidebar';

export const Dashboard = () => {
        const [currentRPM, setCurrentRPM] = React.useState<number>(0.00);
        const [currentData, setCurrentData] = React.useState<any>();

        React.useEffect(() => {
            const interval = setInterval(() => {
                // TODO: Use socket instead
                fetch('http://localhost:3000/rpm/latest')
                    .then(response => response.json())
                    .then(value => setCurrentRPM(value.value));
            }, 500);
            return () => clearInterval(interval);
        }, []);

        React.useEffect(() => {
            // TODO: Use socket instead
            const interval = setInterval(() => {
                // TODO: Use socket instead
                fetch('http://localhost:3000/rpm/all')
                    .then(response => response.json())
                    .then(values => {
                        const tempData = [];
                        for(let i = 0; i < values.length; i++){
                         tempData.push({
                             "name": values[i].timestamp,
                             "uv": values[i].value,
                         });
                        }
                        setCurrentData(tempData);
                    });
            }, 1500);
            return () => clearInterval(interval);
        }, []);

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

        return (
            <main className={classes.content}>
                <div className={classes.toolbar}/>
                <Paper className={classes.paper}>
                    <Grid container={true}>
                        <HotSpotCard title="RPM" value={currentRPM.toFixed(2)}/>
                        {/*<HotSpotCard title="Temperature" value="30 C"/>
                        <HotSpotCard title="Current" value="2.1 A"/>
                        <HotSpotCard title="Voltage" value="12 V"/>*/}
                    </Grid>
                </Paper>

                <Paper className={classes.graph}>
                    <ResponsiveContainer height={300} width="100%">
                        <LineChart data={currentData}>
                            <Line type="monotone" dataKey="uv" stroke="#8884d8"/>
                            <CartesianGrid stroke="#ccc" strokeDasharray="5 5"/>
                            <XAxis dataKey="name"/>
                            <YAxis/>
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </main>
        );

    }
;
