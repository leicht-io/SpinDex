import * as React from 'react';
import './measurement.scss';
import { BLEContext, TrackingContext, UIContext } from '../../context';
import { WindowOption } from '../../context/TrackingContext';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import LibraryMusicIcon from '@mui/icons-material/LibraryMusic';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StopIcon from '@mui/icons-material/Stop';
import {
    AreaSeries,
    Axis,
    DataContext as XYChartDataContext,
    Grid,
    LineSeries,
    XYChart,
} from '@visx/xychart';
import { Group } from '@visx/group';
import { Bucket, Gap, segmentBuckets, yAxisDomain } from '../../core/tracking/resample';
import { formatClock, humanizeDuration } from '../../core/tracking/time';
import { nominalTarget, offsetPercentage, statusFor } from '../../core/tracking/stats';
import { folderLabel } from '../../core/tracking/folders';
import { Menu, useActionMenus } from '../../components/Menu';

export const axisTickLabelProps = {
    fill: '#898781',
    fontSize: 11,
    fontFamily: 'Roboto, sans-serif',
};

interface StatTileProps {
    label: string;
    value: number;
    target: number;
}

const StatTile = ({ label, value, target }: StatTileProps): React.ReactElement => {
    const offset = offsetPercentage(value, target);
    return (
        <div className={ 'stat-tile' }>
            <span className={ 'stat-label' }>{label}</span>
            <span className={ 'stat-value' }>{value.toFixed(2)}<small>RPM</small></span>
            <span className={ `stat-offset status-${ statusFor(offset) }` }>
                <span className={ 'status-dot' } />
                {offset.toFixed(2)}% off
            </span>
        </div>
    );
};

// Renders a translucent red band behind the plot for each detected gap in
// the data (BLE disconnects, the app being closed, etc.), so a missing
// period reads as missing rather than as a flat/interpolated stretch.
export const GapBands = ({ gaps }: { gaps: Gap[] }): React.ReactElement | null => {
    // @visx/text bundles its own nested @types/react, which makes the
    // context's inferred Provider type incompatible with our React import
    // even though it's the same context at runtime — widened to sidestep it.
    const { xScale, innerHeight, margin } = React.useContext(XYChartDataContext);

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
        <Group top={ margin.top }>
            {gaps.map((gap, i) => {
                const x0 = (xScale)(new Date(gap.start));
                const x1 = (xScale)(new Date(gap.end));
                if (typeof x0 !== 'number' || typeof x1 !== 'number') {
                    return null;
                }
                return (
                    <rect
                        key={ i }
                        x={ Math.min(x0, x1) }
                        y={ 0 }
                        width={ Math.max(1, Math.abs(x1 - x0)) }
                        height={ innerHeight ?? 0 }
                        fill="var(--critical)"
                        fillOpacity={ 0.14 }
                    />
                );
            })}
        </Group>
    );
};

const formatStartedAt = (timestamp: number): string =>
    new Date(timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const EmptyState = (): React.ReactElement => {
    const { connected, available, initBluetooth } = React.useContext(BLEContext);
    const { trackings } = React.useContext(TrackingContext);
    const { openDialog, setSidebarOpen } = React.useContext(UIContext);

    if (trackings.length > 0) {
        return (
            <div className={ 'empty-state' }>
                <span className={ 'empty-state-ring' }><LibraryMusicIcon /></span>
                <h2>No measurement open</h2>
                <p className={ 'empty-state-hint' }>Pick a measurement from the library, or record a new one.</p>
                <div className={ 'empty-state-actions' }>
                    <button className={ 'border' }
                        onClick={ () => setSidebarOpen(true) }>Open library</button>
                    <button className={ 'primary' }
                        onClick={ () => openDialog({ kind: 'newMeasurement' }) }>
                        <FiberManualRecordIcon fontSize={ 'small' } /> New measurement
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={ 'empty-state' }>
            <span className={ 'empty-state-ring' }><BluetoothIcon /></span>
            <h2>Record your first measurement</h2>
            <ol className={ 'empty-state-steps' }>
                <li className={ connected ? 'done' : '' }>Pair with the SpinDex sensor</li>
                <li>Choose the turntable (model and serial number) it&apos;s fitted to</li>
                <li>Start recording, then compare runs over time</li>
            </ol>
            <div className={ 'empty-state-actions' }>
                {!connected && (
                    <button className={ 'border' }
                        disabled={ available === false }
                        onClick={ () => initBluetooth() }>
                        <BluetoothIcon fontSize={ 'small' } /> Connect
                    </button>
                )}
                <button className={ 'primary' }
                    onClick={ () => openDialog({ kind: 'newMeasurement' }) }>
                    <FiberManualRecordIcon fontSize={ 'small' } /> New measurement
                </button>
            </div>
        </div>
    );
};

export const Measurement = (): React.ReactElement => {
    const { connected } = React.useContext(BLEContext);
    const {
        folders,
        activeTracking,
        viewingTracking,
        latestValue,
        windowOptions,
        selectedWindow,
        setSelectedWindow,
        chartBuckets,
        chartGaps,
        chartRangeStart,
        chartRangeEnd,
        stopTracking,
    } = React.useContext(TrackingContext);
    const { isCompared, toggleCompare, compare, maxCompare } = React.useContext(UIContext);
    const { trackingItems } = useActionMenus();

    const isViewingLive = activeTracking !== null && viewingTracking?.id === activeTracking.id;
    const lastBucketValue = chartBuckets.length > 0 ? chartBuckets[chartBuckets.length - 1].value : 0;
    const currentValue = isViewingLive ? latestValue : lastBucketValue;
    const target = nominalTarget(currentValue);
    const segments = segmentBuckets(chartBuckets, chartGaps);

    // Always an explicit domain matching exactly what was queried, rather
    // than one @visx/xychart derives from whatever Series data happens to
    // be registered. Two reasons: (1) with zero buckets (a tracking just
    // started, nothing sampled yet) a derived domain comes back `undefined`
    // and the whole chart, axes included, renders as nothing; (2) while
    // live, this reaches all the way to "now" even when the tail of it is
    // empty (BLE disconnected) — needed for the trailing gap band
    // (resampleSamples' liveEndBoundary) to actually be visible instead of
    // sitting off the edge of an axis that stopped short at the last real
    // sample.
    const xScaleConfig = { type: 'time' as const, domain: [new Date(chartRangeStart), new Date(chartRangeEnd)] };

    // See resample.ts's yAxisDomain for why this isn't a fixed [0, target]:
    // that buries real wow/flutter deviations in a couple of pixels at the
    // top of a 33/45-unit axis.
    // `zero: false` on the scale too: @visx/xychart otherwise stretches any
    // linear domain to include 0, silently undoing that zoom.
    const yDomain = React.useMemo(() => yAxisDomain(chartBuckets, target), [chartBuckets, target]);

    if (!viewingTracking) {
        return <EmptyState />;
    }

    const folder = folders.find(f => f.id === viewingTracking.folderId);
    const compared = isCompared(viewingTracking.id);

    const onWindowChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
        const option = windowOptions.find((o: WindowOption) => o.id === event.target.value);
        if (option) {
            setSelectedWindow(option);
        }
    };

    return (
        <div className={ 'view measurement-view' }>
            <div className={ 'view-header' }>
                <div className={ 'view-heading' }>
                    <span className={ 'view-breadcrumb' }>{folder ? folderLabel(folder) : 'Unfiled'}</span>
                    <h2 className={ 'view-title' }>{viewingTracking.name}</h2>
                    <span className={ 'view-meta' }>
                        {formatStartedAt(viewingTracking.startedAt)}
                        {' · '}
                        {humanizeDuration((viewingTracking.stoppedAt ?? Date.now()) - viewingTracking.startedAt)}
                        {' · '}
                        {viewingTracking.sampleCount.toLocaleString()} samples
                    </span>
                </div>

                <div className={ 'view-actions' }>
                    {isViewingLive && (
                        <button className={ 'stop-button' }
                            onClick={ () => stopTracking() }>
                            <StopIcon fontSize={ 'small' } /> Stop
                        </button>
                    )}
                    <button className={ `border ${ compared ? 'selected' : '' }` }
                        onClick={ () => toggleCompare(viewingTracking.id) }
                        disabled={ !compared && compare.length >= maxCompare }
                        aria-pressed={ compared }>
                        <CompareArrowsIcon fontSize={ 'small' } /> {compared ? 'In comparison' : 'Compare'}
                    </button>
                    <select className={ 'app-input window-select' }
                        value={ selectedWindow.id }
                        onChange={ onWindowChange }
                        aria-label={ 'Time window' }>
                        {windowOptions.map((option: WindowOption) => (
                            <option key={ option.id }
                                value={ option.id }>{option.label}</option>
                        ))}
                    </select>
                    <Menu label={ <MoreVertIcon /> }
                        ariaLabel={ 'More actions' }
                        triggerClassName={ 'circle transparent' }
                        align={ 'end' }
                        items={ trackingItems(viewingTracking) } />
                </div>
            </div>

            {isViewingLive && (
                // A tracking stays "active" (not yet stopped) across a BLE drop or a
                // page refresh — neither ends the session — but with no connection no
                // new samples can actually arrive, so say so rather than implying it's
                // still live: a refreshed page resumes the old session's "Recording"
                // state with `connected` reset to false until re-paired, which read as
                // still-measuring even though nothing was coming in.
                <p className={ `recording-banner ${ connected ? '' : 'disconnected' }` }>
                    <span className={ 'recording-dot' } />
                    {connected
                        ? 'Recording'
                        : 'Not connected — reconnect to resume recording'}
                </p>
            )}

            <div className={ 'stat-row' }>
                <StatTile label={ isViewingLive ? 'Current' : 'Last' }
                    value={ currentValue }
                    target={ target } />
                <StatTile
                    label="Avg"
                    value={ viewingTracking.sampleCount > 0 && Number.isFinite(viewingTracking.sum)
                        ? viewingTracking.sum / viewingTracking.sampleCount
                        : 0 }
                    target={ target } />
                <StatTile label="Max"
                    value={ viewingTracking.max === -Infinity ? 0 : viewingTracking.max }
                    target={ target } />
            </div>

            <div className={ 'chart-wrapper' }>
                {/* Plain Series/Axis, not @visx/xychart's Animated* variants: those
                            spring-interpolate the whole path shape on every data change, so
                            while live-tracking (a new bucket every couple of seconds) the
                            entire line/area would visibly re-animate on each refresh instead
                            of just extending. */}
                <XYChart xScale={ xScaleConfig }
                    yScale={ { type: 'linear', domain: yDomain, zero: false } }>
                    <defs>
                        <linearGradient id="rpm-gradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1">
                            <stop offset="0%"
                                stopColor="#3987e5"
                                stopOpacity={ 0.35 } />
                            <stop offset="100%"
                                stopColor="#3987e5"
                                stopOpacity={ 0 } />
                        </linearGradient>
                    </defs>

                    <GapBands gaps={ chartGaps } />

                    <Grid strokeDasharray={ '2 4' }
                        stroke={ '#2c2c2a' }
                        numTicks={ 5 } />

                    {/* enableEvents=false: we don't render a Tooltip, so the hover/
                                focus machinery these would otherwise wire up (findNearestDatumX
                                bisecting into each series' own data on pointermove) is dead
                                code we don't need -- and, per a known @visx/xychart issue, that
                                bisector can hand the accessor an out-of-range (undefined) datum
                                when hovering right at a series' edge, which crashed here. */}
                    {segments.map((segment, i) => (
                        <React.Fragment key={ i }>
                            <AreaSeries
                                dataKey={ `RPM-area-${ i }` }
                                data={ segment }
                                xAccessor={ (d: Bucket) => new Date(d.timestamp) }
                                yAccessor={ (d: Bucket) => d.value }
                                fill="url(#rpm-gradient)"
                                renderLine={ false }
                                enableEvents={ false }
                            />
                            <LineSeries
                                dataKey={ `RPM-${ i }` }
                                data={ segment }
                                xAccessor={ (d: Bucket) => new Date(d.timestamp) }
                                yAccessor={ (d: Bucket) => d.value }
                                stroke={ '#3987e5' }
                                strokeWidth={ 2 }
                                enableEvents={ false }
                            />
                        </React.Fragment>
                    ))}

                    <Axis
                        numTicks={ 5 }
                        tickFormat={ (d: Date) => {
                            const short = selectedWindow.ms !== null && selectedWindow.ms <= 60 * 60 * 1000;
                            return formatClock(d, short);
                        } }
                        stroke={ '#383835' }
                        tickStroke={ '#383835' }
                        tickLabelProps={ () => axisTickLabelProps }
                        orientation="bottom" />
                    <Axis
                        numTicks={ 6 }
                        stroke={ '#383835' }
                        tickStroke={ '#383835' }
                        tickLabelProps={ () => axisTickLabelProps }
                        orientation="left" />
                </XYChart>
            </div>
        </div>
    );
};
