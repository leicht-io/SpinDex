import * as React from 'react';
import {CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis} from 'recharts';
import './dashboard.scss';
import {Box, Card, CardContent, Grid, Typography} from '@mui/material';
import {Page} from '../../components';
import moment from 'moment';
import {BLEContext, DataContext} from '../../context';
import BluetoothIcon from '@mui/icons-material/Bluetooth';

export const Dashboard = () => {
    const {connected, status} = React.useContext(BLEContext);
    const {data} = React.useContext(DataContext);

    const [latestValue, setLatestValue] = React.useState<number>(0);
    const [minValue, setMinValue] = React.useState<number>(0);
    const [maxValue, setMaxValue] = React.useState<number>(0);

    React.useEffect(() => {
        if (data.length > 0) {
            const newestPoint = data[data.length - 1].value;
            setLatestValue(newestPoint);
            if (newestPoint < minValue) {
                setMinValue(newestPoint);
            }
            if (newestPoint > maxValue) {
                setMaxValue(newestPoint);
            }
        }
    }, [data]);

    return (
        <Page>
                <>
                    <Grid
                        container={true}
                        spacing={2}>
                        <Grid
                            xs={3}
                            item={true}>

                            <Card>
                                <CardContent>
                                    <Typography sx={{fontSize: 14}} color="text.secondary" gutterBottom>
                                        Latest reading
                                    </Typography>
                                    <Typography variant="h5" component="div">
                                        {latestValue} RPM
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid
                            xs={2}
                              item={true}>
                            <Card>
                                <CardContent>
                                    <Typography sx={{fontSize: 14}} color="text.secondary" gutterBottom>
                                        Minimum
                                    </Typography>
                                    <Typography variant="h5" component="div">
                                        {minValue} RPM
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid
                            xs={2}
                            item={true}>
                            <Card>
                                <CardContent>
                                    <Typography sx={{fontSize: 14}} color="text.secondary" gutterBottom>
                                        Maximum
                                    </Typography>
                                    <Typography variant="h5" component="div">
                                        {maxValue} RPM
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid
                            xs={5}
                            item={true}>
                            <Card>
                                <CardContent>
                                    <Typography sx={{fontSize: 14}} color="text.secondary" gutterBottom>
                                        Bluetooth Status
                                    </Typography>
                                    <Typography variant="h5" component="div">
                                        {status || "Not Connected"}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                            <Grid
                                xs={12}
                                item={true}>
                                <Card style={{height: 620}}>
                                    <CardContent>
                                        {!connected && (
                                            <Box
                                            display="flex"
                                            justifyContent="center"
                                            alignItems="center"
                                            minHeight="580px" >
                                                <BluetoothIcon  sx={ { mr: 1 } }  />
                                                <Typography variant="h5" component="div">
                                                    Waiting for connection
                                                </Typography>
                                            </Box>
                                        )}

                                        {(connected && data.length > 0) && (
                                        <ResponsiveContainer
                                            height={580}
                                            width="100%">
                                            <ComposedChart
                                                data={data}
                                                margin={{bottom: -10, top: 0, right: 0, left: 0}}>
                                                        <Line
                                                            connectNulls={false}
                                                            type="linear"
                                                            dataKey="value"
                                                            stroke="#8884d8"
                                                            strokeWidth={1}
                                                            isAnimationActive={false}
                                                            dot={false}/>
                                                        <CartesianGrid
                                                            stroke="#d8d8d8"
                                                            strokeDasharray="3 3"
                                                            strokeWidth={1}/>
                                                        <XAxis
                                                            scale={'linear'}
                                                            type={'number'}
                                                            domain={['dataMin', 'dataMax']}
                                                            dataKey="timestamp"
                                                            tickFormatter={(tick) => {
                                                                return moment(tick).format('HH:mm');
                                                            }}/>
                                                        <YAxis
                                                            unit={' RPM'}
                                                            scale={'linear'}
                                                            ticks={[0, 33.33, 45, 50]}
                                                            domain={[0, 50]}/>
                                                        <ReferenceLine y={33.33}
                                                                       stroke="#969696"
                                                                       strokeDasharray="5 5"/>
                                                        <ReferenceLine y={45}
                                                                       stroke="#969696"
                                                                       strokeDasharray="5 5"/>
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                    </Grid>
                </>
        </Page>
    );
};
