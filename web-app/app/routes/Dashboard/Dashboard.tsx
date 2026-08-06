import * as React from 'react';
import './dashboard.scss';
import {Box, Typography} from '@mui/material';
import moment from 'moment';
import {BLEContext, DataContext} from '../../context';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import {AnimatedAreaSeries, AnimatedAxis, AnimatedLineSeries, Grid, XYChart} from "@visx/xychart";

const axisTickLabelProps = {
    fill: '#898781',
    fontSize: 11,
    fontFamily: 'Roboto, sans-serif',
};

type Status = 'good' | 'warning' | 'serious' | 'critical';

// Bands how far a reading sits from the nominal 33.33/45 RPM target. Tighter
// than typical consumer wow-and-flutter specs (~±0.5-1%) so the tiles stay
// meaningful at a glance rather than reading "good" for anything plausible.
const statusFor = (offsetPercentage: string): Status => {
    const offset = Number(offsetPercentage);

    if (offset <= 0.5) {
        return 'good';
    }
    if (offset <= 1.5) {
        return 'warning';
    }
    if (offset <= 3) {
        return 'serious';
    }
    return 'critical';
};

interface StatTileProps {
    label: string;
    value: number;
    offsetPercentage: string;
}

const StatTile = ({label, value, offsetPercentage}: StatTileProps): React.ReactElement => (
    <div className={"stat-tile"}>
        <span className={"stat-label"}>{label}</span>
        <span className={"stat-value"}>{value}<small>RPM</small></span>
        <span className={`stat-offset status-${statusFor(offsetPercentage)}`}>
            <i className={"status-dot"}/>
            {offsetPercentage}% off
        </span>
    </div>
);

export const Dashboard = () => {
    const {connected} = React.useContext(BLEContext);
    const {data} = React.useContext(DataContext);

    const [latestValue, setLatestValue] = React.useState<number>(0);
    const [minValue, setMinValue] = React.useState<number>(99);
    const [maxValue, setMaxValue] = React.useState<number>(0);
    const [offsetMinPercentage, setOffsetMinPercentage] = React.useState<string>("0");
    const [offsetMaxPercentage, setOffsetMaxPercentage] = React.useState<string>("0");
    const [offsetCurrentPercentage, setOffsetCurrentPercentage] = React.useState<string>("0");
    const [detectedSpeed, setDetectedSpeed] = React.useState<33 | 45>(33);

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

            if (newestPoint > 40) {
                if (detectedSpeed !== 45) {
                    setDetectedSpeed(45);
                }

                setOffsetCurrentPercentage((Math.abs(45 - newestPoint) / ((45 + newestPoint) / 2)).toFixed(2))
                setOffsetMaxPercentage((Math.abs(45 - maxValue) / ((45 + maxValue) / 2)).toFixed(2))
                setOffsetMinPercentage((Math.abs(45 - minValue) / ((45 + minValue) / 2)).toFixed(2))
            } else {
                if (detectedSpeed !== 33) {
                    setDetectedSpeed(33);
                }

                setOffsetCurrentPercentage((Math.abs(33.33 - newestPoint) / ((33.33 + newestPoint) / 2)).toFixed(2))
                setOffsetMaxPercentage((Math.abs(33.33 - maxValue) / ((33.33 + maxValue) / 2)).toFixed(2))
                setOffsetMinPercentage((Math.abs(33.33 - minValue) / ((33.33 + minValue) / 2)).toFixed(2))
            }
        }
    }, [data]);

    React.useEffect(() => {
        setMinValue(99);
        setMaxValue(0);
    }, [detectedSpeed]);

    const accessors = {
        xAccessor: (d) => d.timestamp,
        yAccessor: (d) => d.value,
    };

    return (
        <div className={"dashboard"}>
            <div className={"dashboard-content"}>
                <article className="dashboard-panel">
                    {!connected && (
                        <Box
                            className={"empty-state"}
                            display="flex"
                            flexDirection={"column"}
                            justifyContent="center"
                            alignItems="center"
                            height="calc(100vh - 224px)">
                            <span className={"empty-state-ring"}>
                                <BluetoothIcon/>
                            </span>
                            <Typography variant="h6" component="div">
                                Waiting for connection
                            </Typography>
                            <Typography variant="body2" component="div" className={"empty-state-hint"}>
                                Use the button below to pair with SpinDex
                            </Typography>
                        </Box>
                    )}

                    {(connected && data.length > 0) && (
                        <Box
                            display="flex"
                            flexDirection={"column"}
                            height="calc(100vh - 224px)">
                            <div className={"stat-row"}>
                                <StatTile label="Current" value={latestValue} offsetPercentage={offsetCurrentPercentage}/>
                                <StatTile label="Min" value={minValue} offsetPercentage={offsetMinPercentage}/>
                                <StatTile label="Max" value={maxValue} offsetPercentage={offsetMaxPercentage}/>
                            </div>

                            <div className={"chart-wrapper"}>
                                <XYChart xScale={{type: 'band'}} yScale={{type: 'linear', domain: [0, detectedSpeed]}}>
                                    <defs>
                                        <linearGradient id="rpm-gradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3987e5" stopOpacity={0.35}/>
                                            <stop offset="100%" stopColor="#3987e5" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>

                                    <Grid
                                        strokeDasharray={"2 4"}
                                        stroke={"#2c2c2a"}
                                        numTicks={5}/>

                                    <AnimatedAreaSeries
                                        dataKey="RPM-area"
                                        data={data}
                                        {...accessors}
                                        fill="url(#rpm-gradient)"
                                        renderLine={false}
                                    />

                                    <AnimatedLineSeries
                                        stroke={"#3987e5"}
                                        strokeWidth={2}
                                        dataKey="RPM"
                                        data={data}
                                        {...accessors}
                                    />

                                    <AnimatedAxis
                                        numTicks={5}
                                        tickFormat={(d) => {
                                            return moment(d).format('HH:mm');
                                        }}
                                        stroke={"#383835"}
                                        tickStroke={"#383835"}
                                        tickLabelProps={() => axisTickLabelProps}
                                        orientation="bottom"/>
                                    <AnimatedAxis
                                        numTicks={6}
                                        stroke={"#383835"}
                                        tickStroke={"#383835"}
                                        tickLabelProps={() => axisTickLabelProps}
                                        orientation="left"/>
                                </XYChart>
                            </div>
                        </Box>
                    )}
                </article>
            </div>
        </div>
    );
};
