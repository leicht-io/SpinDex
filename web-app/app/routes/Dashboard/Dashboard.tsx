import * as React from 'react';
import './dashboard.scss';
import {Box, Typography} from '@mui/material';
import moment from 'moment';
import {BLEContext, TrackingContext} from '../../context';
import {WindowOption} from '../../context/TrackingContext';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import {
    AnimatedAreaSeries,
    AnimatedAxis,
    AnimatedLineSeries,
    DataContext as XYChartDataContext,
    Grid,
    XYChart,
} from "@visx/xychart";
import {Group} from '@visx/group';
import {Bucket, Gap, segmentBuckets} from '../../core/tracking/resample';

const axisTickLabelProps = {
    fill: '#898781',
    fontSize: 11,
    fontFamily: 'Roboto, sans-serif',
};

type Status = 'good' | 'warning' | 'serious' | 'critical';

// A reading's nominal target is whichever of the two BG4000-series speeds
// it's closer to.
const nominalTarget = (value: number): number => (value > 40 ? 45 : 33.33);

// Symmetric percentage difference from the nominal target.
const offsetPercentage = (value: number, target: number): number =>
    (Math.abs(target - value) / ((target + value) / 2)) * 100;

// Bands how far a reading sits from its nominal target. Tighter than
// typical consumer wow-and-flutter specs (~±0.5-1%) so the tiles stay
// meaningful at a glance rather than reading "good" for anything plausible.
const statusFor = (offset: number): Status => {
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
    target: number;
}

const StatTile = ({label, value, target}: StatTileProps): React.ReactElement => {
    const offset = offsetPercentage(value, target);
    return (
        <div className={"stat-tile"}>
            <span className={"stat-label"}>{label}</span>
            <span className={"stat-value"}>{value.toFixed(2)}<small>RPM</small></span>
            <span className={`stat-offset status-${statusFor(offset)}`}>
                <i className={"status-dot"}/>
                {offset.toFixed(2)}% off
            </span>
        </div>
    );
};

// Renders a translucent red band behind the plot for each detected gap in
// the data (BLE disconnects, the app being closed, etc.), so a missing
// period reads as missing rather than as a flat/interpolated stretch.
const GapBands = ({gaps}: { gaps: Gap[] }): React.ReactElement | null => {
    // @visx/text bundles its own nested @types/react, which makes the
    // context's inferred Provider type incompatible with our React import
    // even though it's the same context at runtime — widened to sidestep it.
    const {xScale, innerHeight, margin} = React.useContext(XYChartDataContext as unknown as React.Context<any>);

    if (!xScale || !margin || gaps.length === 0) {
        return null;
    }

    return (
        // Only `top` here, not `left`: xScale's output range already spans
        // the full absolute SVG width including the left margin (visx's
        // Series/Grid/Axis children read it directly with no extra offset
        // of their own), so also offsetting this Group by `margin.left`
        // shifted every band that many pixels too far right of the data it
        // was meant to sit under.
        <Group top={margin.top}>
            {gaps.map((gap, i) => {
                const x0 = (xScale as any)(new Date(gap.start));
                const x1 = (xScale as any)(new Date(gap.end));
                if (typeof x0 !== 'number' || typeof x1 !== 'number') {
                    return null;
                }
                return (
                    <rect
                        key={i}
                        x={Math.min(x0, x1)}
                        y={0}
                        width={Math.max(1, Math.abs(x1 - x0))}
                        height={innerHeight ?? 0}
                        fill="var(--critical)"
                        fillOpacity={0.14}
                    />
                );
            })}
        </Group>
    );
};

const formatDuration = (startedAt: number, stoppedAt: number | null): string =>
    moment.duration((stoppedAt ?? Date.now()) - startedAt).humanize();

export const Dashboard = () => {
    const {connected} = React.useContext(BLEContext);
    const {
        trackings,
        activeTracking,
        viewingTracking,
        latestValue,
        windowOptions,
        selectedWindow,
        setSelectedWindow,
        chartBuckets,
        chartGaps,
        startTracking,
        stopTracking,
        deleteTracking,
        exportTracking,
        viewTracking,
    } = React.useContext(TrackingContext);

    const isViewingLive = activeTracking !== null && viewingTracking?.id === activeTracking.id;
    const lastBucketValue = chartBuckets.length > 0 ? chartBuckets[chartBuckets.length - 1].value : 0;
    const currentValue = isViewingLive ? latestValue : lastBucketValue;
    const target = nominalTarget(currentValue);
    const segments = segmentBuckets(chartBuckets, chartGaps);

    // @visx/xychart derives the x scale's domain from the data points
    // registered by its Series children — with none mounted (a tracking
    // that's just been started has no samples yet) that domain comes back
    // `undefined` and the whole chart, axes included, renders as nothing.
    // Falling back to the selected window's span keeps the empty frame
    // visible while the first samples come in.
    const xScaleConfig = chartBuckets.length > 0
        ? {type: 'time' as const}
        : {type: 'time' as const, domain: [new Date(Date.now() - (selectedWindow.ms ?? 10 * 60 * 1000)), new Date()]};

    const onWindowChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        const option = windowOptions.find((o: WindowOption) => o.id === event.target.value);
        if (option) {
            setSelectedWindow(option);
        }
    };

    const onDeleteTracking = (id: string, name: string): void => {
        if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
            deleteTracking(id);
        }
    };

    return (
        <div className={"dashboard"}>
            <div className={"dashboard-content"}>
                <article className="dashboard-panel">
                    <div className={"tracking-controls"}>
                        {activeTracking ? (
                            <button className={"primary"} onClick={() => stopTracking()}>
                                <StopIcon fontSize={"small"}/> Stop Tracking
                            </button>
                        ) : (
                            <button
                                className={"primary"}
                                onClick={() => startTracking()}
                                disabled={!connected}
                                title={connected ? undefined : "Pair with SpinDex before starting a tracking"}>
                                <PlayArrowIcon fontSize={"small"}/> Start Tracking
                            </button>
                        )}

                        {activeTracking && (
                            <span className={"tracking-active-label"}>
                                Recording "{activeTracking.name}" — {activeTracking.sampleCount.toLocaleString()} samples
                            </span>
                        )}

                        {viewingTracking && (
                            <select className={"window-select"} value={selectedWindow.id} onChange={onWindowChange}>
                                {windowOptions.map((option: WindowOption) => (
                                    <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {!connected && !viewingTracking && (
                        <Box
                            className={"empty-state"}
                            display="flex"
                            flexDirection={"column"}
                            justifyContent="center"
                            alignItems="center"
                            height="calc(100vh - 320px)">
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

                    {viewingTracking && (
                        <Box display="flex" flexDirection={"column"} height="calc(100vh - 320px)">
                            <div className={"stat-row"}>
                                <StatTile label={isViewingLive ? "Current" : "Last"} value={currentValue} target={target}/>
                                <StatTile label="Min" value={viewingTracking.min === Infinity ? 0 : viewingTracking.min} target={target}/>
                                <StatTile label="Max" value={viewingTracking.max === -Infinity ? 0 : viewingTracking.max} target={target}/>
                            </div>

                            <div className={"chart-wrapper"}>
                                <XYChart xScale={xScaleConfig} yScale={{type: 'linear', domain: [0, target]}}>
                                    <defs>
                                        <linearGradient id="rpm-gradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#3987e5" stopOpacity={0.35}/>
                                            <stop offset="100%" stopColor="#3987e5" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>

                                    <GapBands gaps={chartGaps}/>

                                    <Grid strokeDasharray={"2 4"} stroke={"#2c2c2a"} numTicks={5}/>

                                    {segments.map((segment, i) => (
                                        <React.Fragment key={i}>
                                            <AnimatedAreaSeries
                                                dataKey={`RPM-area-${i}`}
                                                data={segment}
                                                xAccessor={(d: Bucket) => new Date(d.timestamp)}
                                                yAccessor={(d: Bucket) => d.value}
                                                fill="url(#rpm-gradient)"
                                                renderLine={false}
                                            />
                                            <AnimatedLineSeries
                                                dataKey={`RPM-${i}`}
                                                data={segment}
                                                xAccessor={(d: Bucket) => new Date(d.timestamp)}
                                                yAccessor={(d: Bucket) => d.value}
                                                stroke={"#3987e5"}
                                                strokeWidth={2}
                                            />
                                        </React.Fragment>
                                    ))}

                                    <AnimatedAxis
                                        numTicks={5}
                                        tickFormat={(d: Date) => {
                                            const short = selectedWindow.ms !== null && selectedWindow.ms <= 60 * 60 * 1000;
                                            return moment(d).format(short ? 'HH:mm:ss' : 'HH:mm');
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

                <article className={"trackings-panel"}>
                    <h6 className={"trackings-title"}>Trackings</h6>

                    {trackings.length === 0 && (
                        <p className={"trackings-empty"}>No trackings yet — start one above to begin logging.</p>
                    )}

                    {trackings.map(tracking => (
                        <div
                            key={tracking.id}
                            className={`tracking-row ${tracking.id === viewingTracking?.id ? 'active' : ''}`}>
                            <button className={"tracking-row-main transparent"} onClick={() => viewTracking(tracking.id)}>
                                <span className={"tracking-row-name"}>
                                    {tracking.stoppedAt === null && <i className={"tracking-row-live-dot"}/>}
                                    {tracking.name}
                                </span>
                                <span className={"tracking-row-meta"}>
                                    {formatDuration(tracking.startedAt, tracking.stoppedAt)} · {tracking.sampleCount.toLocaleString()} samples
                                </span>
                            </button>
                            <button
                                className={"circle transparent"}
                                onClick={() => exportTracking(tracking.id)}
                                aria-label={`Export ${tracking.name} as CSV`}>
                                <DownloadIcon fontSize={"small"}/>
                            </button>
                            <button
                                className={"circle transparent"}
                                onClick={() => onDeleteTracking(tracking.id, tracking.name)}
                                aria-label={`Delete ${tracking.name}`}>
                                <DeleteIcon fontSize={"small"}/>
                            </button>
                        </div>
                    ))}
                </article>
            </div>
        </div>
    );
};
