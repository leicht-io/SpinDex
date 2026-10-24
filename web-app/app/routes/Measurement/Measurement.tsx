import * as React from 'react';
import './measurement.scss';
import { LinkContext, TrackingContext, UIContext } from '../../context';
import { WindowOption } from '../../context/TrackingContext';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
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
import { Menu, Select, useActionMenus } from '../../components/Menu';
import { SpinDexMark } from '../../components/Logo';
import { ConnectButtons } from '../../components/ConnectButtons';
import { NARROW_QUERY, useMediaQuery } from '../../core/hooks/useMediaQuery';

// Chart chrome in theme.scss's colors. Literal hexes rather than var(--...):
// these land in SVG presentation attributes, which can't be relied on to
// resolve CSS custom properties.
export const CHART = {
    accent: '#e07a4f',
    grid: '#2a2826',
    axis: '#3a3836',
    tick: '#8d8a84',
};

export const axisTickLabelProps = {
    fill: CHART.tick,
    fontSize: 10,
    fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
    letterSpacing: '0.04em',
};

// How far either side of nominal the tile gauges reach, in percent --
// matches statusFor's outer "serious" band.
const GAUGE_RANGE = 3;

const pad2 = (n: number): string => String(n).padStart(2, '0');

interface StatTileProps {
    index: number;
    label: string;
    value: number;
    target: number;
}

const StatTile = ({ index, label, value, target }: StatTileProps): React.ReactElement => {
    const offset = offsetPercentage(value, target);
    const signed = value > 0 ? ((value - target) / target) * 100 : 0;
    // Marker position on a -GAUGE_RANGE..+GAUGE_RANGE % scale, clamped.
    const position = 50 + (Math.max(-GAUGE_RANGE, Math.min(GAUGE_RANGE, signed)) / GAUGE_RANGE) * 50;
    const [whole, fraction] = value.toFixed(2).split('.');

    return (
        <div className={ 'stat-tile' }>
            <span className={ 'stat-label' }>
                <span className={ 'stat-index' }>{pad2(index)}</span>
                {label}
            </span>
            <span className={ 'stat-value' }>
                {whole}<span className={ 'stat-fraction' }>.{fraction}</span>
                <small>RPM</small>
            </span>
            <div className={ 'stat-gauge' }
                aria-hidden="true">
                <span className={ `stat-gauge-marker status-${ statusFor(offset) }` }
                    style={ { left: `${ position }%` } } />
            </div>
            <span className={ `stat-offset status-${ statusFor(offset) }` }>
                <span className={ 'status-dot' } />
                {signed >= 0 ? '+' : '−'}{Math.abs(signed).toFixed(2)}%
                <span className={ 'stat-offset-ref' }>vs {target === 45 ? '45' : '33⅓'}</span>
            </span>
        </div>
    );
};

// Dashed reference line at the nominal speed -- the line every reading is
// judged against. Labelled in the panel header rather than in the plot,
// where the trace (which hugs nominal) would run straight through it.
// Skipped when it's outside the zoomed y-domain.
const TargetLine = ({ target }: { target: number }): React.ReactElement | null => {
    const { xScale, yScale, innerWidth, margin } = React.useContext(XYChartDataContext);
    if (!xScale || !yScale || !margin || !innerWidth) {
        return null;
    }
    const y = yScale(target);
    const [lo, hi] = (yScale.domain() as number[]);
    if (typeof y !== 'number' || target < Math.min(lo, hi) || target > Math.max(lo, hi)) {
        return null;
    }
    return (
        <g>
            <line x1={ margin.left }
                x2={ margin.left + innerWidth }
                y1={ y }
                y2={ y }
                stroke={ CHART.accent }
                strokeOpacity={ 0.55 }
                strokeDasharray={ '6 4' } />
        </g>
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
    const { connected, canConnect } = React.useContext(LinkContext);
    const { trackings } = React.useContext(TrackingContext);
    const { openDialog, setSidebarOpen } = React.useContext(UIContext);

    if (trackings.length > 0) {
        return (
            <div className={ 'empty-state' }>
                <span className={ 'empty-state-reticle' }><SpinDexMark size={ 72 } /></span>
                <span className={ 'empty-state-eyebrow' }>Standby</span>
                <h2>No measurement open</h2>
                <p className={ 'empty-state-hint' }>Pick a measurement from the library, or record a new one.</p>
                <div className={ 'empty-state-actions' }>
                    <button className={ 'border empty-state-library' }
                        onClick={ () => setSidebarOpen(true) }>Open library</button>
                    <button className={ 'primary' }
                        onClick={ () => openDialog({ kind: 'newMeasurement' }) }>
                        <span className={ 'rec-dot' } /> New measurement
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={ 'empty-state' }>
            <span className={ 'empty-state-reticle' }><SpinDexMark size={ 72 } /></span>
            <span className={ 'empty-state-eyebrow' }>Getting started</span>
            <h2>Record your first measurement</h2>
            <ol className={ 'empty-state-steps' }>
                <li className={ connected ? 'done' : '' }>Connect the SpinDex sensor, over Bluetooth or a USB cable</li>
                <li>Choose the turntable (model and serial number) it&apos;s fitted to</li>
                <li>Start recording, then compare runs over time</li>
            </ol>
            <div className={ 'empty-state-actions' }>
                {!connected && (canConnect ? (
                    <ConnectButtons className={ 'border' } />
                ) : (
                    <button className={ 'border' }
                        onClick={ () => openDialog({ kind: 'connectionHelp' }) }>
                        Can’t connect from this browser — read more
                    </button>
                ))}
                <button className={ 'primary' }
                    onClick={ () => openDialog({ kind: 'newMeasurement' }) }>
                    <span className={ 'rec-dot' } /> New measurement
                </button>
            </div>
        </div>
    );
};

export const Measurement = (): React.ReactElement => {
    const { connected } = React.useContext(LinkContext);
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
    const narrow = useMediaQuery(NARROW_QUERY);

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

    const onWindowChange = (id: string): void => {
        const option = windowOptions.find((o: WindowOption) => o.id === id);
        if (option) {
            setSelectedWindow(option);
        }
    };

    return (
        <div className={ 'view measurement-view' }>
            <div className={ 'view-header' }>
                <div className={ 'view-heading' }>
                    <span className={ 'view-breadcrumb' }>
                        {folder ? folderLabel(folder) : 'Unfiled'}
                        {isViewingLive && (
                            // A tracking stays "active" (not yet stopped) across a BLE drop or
                            // a page refresh — neither ends the session — but with no
                            // connection no new samples can arrive, so say so rather than
                            // implying it's still live.
                            <span className={ `view-live ${ connected ? '' : 'paused' }` }>
                                <span className={ 'view-live-dot' } />
                                {connected ? 'Rec' : 'Paused — reconnect to resume'}
                            </span>
                        )}
                    </span>
                    <h2 className={ 'view-title' }>{viewingTracking.name}</h2>
                    <dl className={ 'view-specs' }>
                        <div>
                            <dt>Started</dt>
                            <dd>{formatStartedAt(viewingTracking.startedAt)}</dd>
                        </div>
                        <div>
                            <dt>Duration</dt>
                            <dd>{humanizeDuration((viewingTracking.stoppedAt ?? Date.now()) - viewingTracking.startedAt)}</dd>
                        </div>
                        <div>
                            <dt>Samples</dt>
                            <dd>{viewingTracking.sampleCount.toLocaleString()}</dd>
                        </div>
                        <div>
                            <dt>Nominal</dt>
                            <dd>{target === 45 ? '45' : '33⅓'} rpm</dd>
                        </div>
                    </dl>
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
                    <Select className={ 'window-select' }
                        value={ selectedWindow.id }
                        onChange={ onWindowChange }
                        ariaLabel={ 'Time window' }
                        options={ windowOptions.map((option: WindowOption) => ({ value: option.id, label: option.label })) } />
                    <Menu label={ <MoreVertIcon /> }
                        ariaLabel={ 'More actions' }
                        triggerClassName={ 'square transparent' }
                        align={ 'end' }
                        items={ trackingItems(viewingTracking) } />
                </div>
            </div>

            <div className={ 'stat-row' }>
                <StatTile index={ 1 }
                    label={ isViewingLive ? 'Current' : 'Last' }
                    value={ currentValue }
                    target={ target } />
                <StatTile
                    index={ 2 }
                    label="Average"
                    value={ viewingTracking.sampleCount > 0 && Number.isFinite(viewingTracking.sum)
                        ? viewingTracking.sum / viewingTracking.sampleCount
                        : 0 }
                    target={ target } />
                <StatTile index={ 3 }
                    label="Peak"
                    value={ viewingTracking.max === -Infinity ? 0 : viewingTracking.max }
                    target={ target } />
            </div>

            <div className={ 'chart-panel' }>
                <div className={ 'chart-panel-header' }>
                    <span>Speed · rpm</span>
                    <span className={ 'chart-panel-nominal' }>Nominal {target === 45 ? '45.00' : '33.33'}</span>
                    <span className={ 'chart-panel-window' }>Window · {selectedWindow.label}</span>
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
                                    stopColor={ CHART.accent }
                                    stopOpacity={ 0.35 } />
                                <stop offset="100%"
                                    stopColor={ CHART.accent }
                                    stopOpacity={ 0 } />
                            </linearGradient>
                        </defs>

                        <GapBands gaps={ chartGaps } />

                        <Grid strokeDasharray={ '1 3' }
                            stroke={ CHART.grid }
                            numTicks={ 5 } />

                        <TargetLine target={ target } />

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
                                    stroke={ CHART.accent }
                                    strokeWidth={ 1.5 }
                                    enableEvents={ false }
                                />
                            </React.Fragment>
                        ))}

                        <Axis
                            numTicks={ narrow ? 3 : 5 }
                            tickFormat={ (d: Date) => {
                                const short = selectedWindow.ms !== null && selectedWindow.ms <= 60 * 60 * 1000;
                                return formatClock(d, short);
                            } }
                            stroke={ CHART.axis }
                            tickStroke={ CHART.axis }
                            tickLabelProps={ () => axisTickLabelProps }
                            orientation="bottom" />
                        <Axis
                            numTicks={ 6 }
                            stroke={ CHART.axis }
                            tickStroke={ CHART.axis }
                            tickLabelProps={ () => axisTickLabelProps }
                            orientation="left" />
                    </XYChart>
                </div>
            </div>
        </div>
    );
};
