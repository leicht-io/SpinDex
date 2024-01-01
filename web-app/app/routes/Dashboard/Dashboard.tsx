import * as React from 'react';
import {ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import './dashboard.scss';
import {Box, Typography} from '@mui/material';
import moment from 'moment';
import {BLEContext, DataContext} from '../../context';
import BluetoothIcon from '@mui/icons-material/Bluetooth';

export const Dashboard = () => {
    const {connected} = React.useContext(BLEContext);
    const {data} = React.useContext(DataContext);

    const [latestValue, setLatestValue] = React.useState<number>(0);
    const [minValue, setMinValue] = React.useState<number>(99);
    const [maxValue, setMaxValue] = React.useState<number>(0);
   // const [offsetMinPercentage, setOffsetMinPercentage] = React.useState<string>("0");
  //  const [offsetMaxPercentage, setOffsetMaxPercentage] = React.useState<string>("0");
   // const [offsetCurrentPercentage, setOffsetCurrentPercentage] = React.useState<string>("0");

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


            /* if(newestPoint > 40) {
                setOffsetCurrentPercentage((Math.abs(45 - newestPoint) / ((45 + newestPoint) / 2)).toFixed(2) )
                setOffsetMaxPercentage((Math.abs(45 - maxValue) / ((45 + maxValue) / 2)).toFixed(2) )
                setOffsetMinPercentage((Math.abs(45 - minValue) / ((45 + minValue) / 2)).toFixed(2) )
            } else {
                setOffsetCurrentPercentage((Math.abs(33.33 - newestPoint) / ((33.33 + newestPoint) / 2)).toFixed(2) )
                setOffsetMaxPercentage((Math.abs(33.33 - maxValue) / ((33.33 + maxValue) / 2)).toFixed(2) )
                setOffsetMinPercentage((Math.abs(33.33 - minValue) / ((33.33 + minValue) / 2)).toFixed(2) )
            }*/
        }
    }, [data]);

    return (
        <div className={"dashboard"}>
            <div className={"dashboard-content"}>

                <article className="border tertiary-container">
                    {!connected && (
                        <Box
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                            height="calc(100vh - 224px)">
                            <BluetoothIcon sx={{mr: 1}}/>
                            <Typography variant="h5" component="div">
                                Waiting for connection
                            </Typography>
                        </Box>
                    )}

                    {(connected && data.length > 0) && (
                        <Box
                            display="flex"
                            flexDirection={"column"}
                            height="calc(100vh - 224px)">
                            <div className={"chips-wrapper"}>
                                <a className="chip fill">Current: {latestValue} RPM</a>
                                <a className="chip fill">Min: {minValue} RPM</a>
                                <a className="chip fill">Max: {maxValue} RPM</a>
                            </div>

                            <ResponsiveContainer
                                height="90%"
                                width="100%">
                                <ComposedChart
                                    data={data}
                                    margin={{bottom: -10, top: 0, right: 0, left: 0}}>
                                    <Tooltip
                                        formatter={(value) => {
                                            return `${value} RPM`
                                        }}
                                        labelFormatter={(value) => {
                                            return ""
                                        }}
                                    />

                                    <XAxis
                                        scale={'linear'}
                                        type={'number'}
                                        interval={"preserveStartEnd"}
                                        domain={['dataMin', 'dataMax']}
                                        dataKey="timestamp"
                                        tickFormatter={(tick) => {
                                            return moment(tick).format('HH:mm');
                                        }}/>
                                    <YAxis
                                        unit={' RPM'}
                                        scale={'linear'}
                                        ticks={[0, 33.33, 45, 50]}
                                        domain={[-1, 50]}/>
                                    <ReferenceLine y={33.33}
                                                   stroke="#969696"
                                                   strokeDasharray="5 5"/>
                                    <ReferenceLine y={45}
                                                   stroke="#969696"
                                                   strokeDasharray="5 5"/>
                                    <Line
                                        connectNulls={false}
                                        type="linear"
                                        dataKey="value"
                                        stroke="#ffffff"
                                        strokeWidth={2}
                                        isAnimationActive={false}
                                        dot={false}/>
                                </ComposedChart>
                            </ResponsiveContainer>
                        </Box>
                    )}
                </article>
            </div>
        </div>
    );
};
