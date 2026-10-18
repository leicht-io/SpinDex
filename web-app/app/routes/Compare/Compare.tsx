import * as React from 'react';
import './compare.scss';
import CloseIcon from '@mui/icons-material/Close';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { Axis, Grid, LineSeries, Tooltip, XYChart } from '@visx/xychart';
import { TrackingContext, UIContext } from '../../context';
import { getAllSamples, Sample, Tracking } from '../../core/storage/db';
import { Bucket, bucketDurationFor, Gap, resampleSamples, segmentBuckets, yAxisDomain } from '../../core/tracking/resample';
import {
    computeStats,
    formatElapsed,
    isAtSpeed,
    MeasurementStats,
    nominalTarget,
    offsetPercentage,
    statusFor,
    toElapsed,
} from '../../core/tracking/stats';
import { folderLabel } from '../../core/tracking/folders';
import { humanizeDuration } from '../../core/tracking/time';
import { axisTickLabelProps, GapBands } from '../Measurement';

// Fewer points per series than the single view's 600: up to eight lines
// share the chart, and hover bisects every one of them.
const COMPARE_CHART_POINTS = 400;
// A live measurement in the comparison is re-read this often.
const LIVE_REFRESH_MS = 10_000;

interface LoadedSamples {
    // Samples re-based to ms since the measurement started.
    samples: Sample[];
    stats: MeasurementStats | null;
}

interface Series {
    tracking: Tracking;
    color: string;
    segments: Bucket[][];
    gaps: Gap[];
    stats: MeasurementStats | null;
    durationMs: number;
}

const durationOf = (tracking: Tracking): number => (tracking.stoppedAt ?? Date.now()) - tracking.startedAt;

const segmentKey = (trackingId: string, index: number): string => `${ trackingId }::${ index }`;

// Accessors tolerate an undefined datum: @visx/xychart's nearest-datum
// bisector can hand one over when hovering right at a series' edge.
const xAccessor = (d?: Bucket): number => d?.timestamp ?? 0;

const formatSigned = (value: number, digits: number): string =>
    `${ value > 0 ? '+' : value < 0 ? '−' : '' }${ Math.abs(value).toFixed(digits) }`;

export const Compare = (): React.ReactElement => {
    const { trackings, folders, activeTracking } = React.useContext(TrackingContext);
    const { compare, toggleCompare, clearCompare, openMeasurement, setSidebarOpen } = React.useContext(UIContext);

    const [loaded, setLoaded] = React.useState<Record<string, LoadedSamples>>({});
    const [isLoading, setIsLoading] = React.useState(false);

    const ids = compare.map(e => e.id);
    const idsKey = ids.join(',');
    const liveId = activeTracking && ids.includes(activeTracking.id) ? activeTracking.id : null;

    // Loads only the measurements not already in memory, so adding one to
    // the comparison doesn't re-read all the others.
    React.useEffect(() => {
        let cancelled = false;
        const missing = ids.filter(id => !(id in loaded));
        if (missing.length === 0) {
            return;
        }

        setIsLoading(true);
        (async () => {
            const entries = await Promise.all(missing.map(async (id) => {
                const tracking = trackings.find(t => t.id === id) as Tracking;
                const samples = toElapsed(await getAllSamples(id), tracking.startedAt);
                return [id, { samples, stats: computeStats(samples) }] as const;
            }));
            if (!cancelled) {
                setLoaded(prev => ({ ...prev, ...Object.fromEntries(entries) }));
                setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [idsKey]);

    // A still-recording measurement keeps growing -- re-read just that one.
    React.useEffect(() => {
        if (!liveId) {
            return;
        }
        const intervalId = setInterval(async () => {
            const tracking = trackings.find(t => t.id === liveId);
            if (!tracking) {
                return;
            }
            const samples = toElapsed(await getAllSamples(liveId), tracking.startedAt);
            setLoaded(prev => ({ ...prev, [liveId]: { samples, stats: computeStats(samples) } }));
        }, LIVE_REFRESH_MS);
        return () => clearInterval(intervalId);
    }, [liveId]);

    const series: Series[] = React.useMemo(() => {
        const entries = compare
            .map(entry => ({ entry, tracking: trackings.find(t => t.id === entry.id), data: loaded[entry.id] }))
            .filter((e): e is { entry: typeof e.entry; tracking: Tracking; data: LoadedSamples } => !!e.tracking && !!e.data);

        // One bucket width for every series, so lines are equally smooth and
        // the shortest run isn't drawn at a needlessly fine resolution.
        const longest = Math.max(1, ...entries.map(e => durationOf(e.tracking)));
        const bucketMs = bucketDurationFor(longest, COMPARE_CHART_POINTS);

        return entries.map(({ entry, tracking, data }) => {
            const { buckets, gaps } = resampleSamples(data.samples, bucketMs);
            return {
                tracking,
                color: entry.color,
                segments: segmentBuckets(buckets, gaps),
                gaps,
                stats: data.stats,
                durationMs: durationOf(tracking),
            };
        });
    }, [compare, loaded, trackings]);

    const allBuckets = React.useMemo(() => series.flatMap(s => s.segments.flat()), [series]);
    const referenceMean = series.find(s => s.stats)?.stats?.mean ?? 33.33;
    const target = nominalTarget(referenceMean);
    // The spin-up from 0 at the start of every run (and any stop mid-run)
    // would stretch the axis down to 0 and flatten the fraction-of-a-percent
    // differences being compared -- scale to at-speed readings only, and pin
    // anything below the axis to its bottom edge.
    const yDomain = React.useMemo(() => {
        const atSpeed = allBuckets.filter(b => isAtSpeed(b.min) && isAtSpeed(b.max));
        return yAxisDomain(atSpeed.length > 0 ? atSpeed : allBuckets, target);
    }, [allBuckets, target]);
    const yAccessor = (d?: Bucket): number => Math.max(d?.value ?? 0, yDomain[0]);
    const xMax = Math.max(1, ...series.map(s => s.durationMs));
    const seriesById = new Map(series.map(s => [s.tracking.id, s]));

    if (compare.length === 0) {
        return (
            <div className={ 'empty-state' }>
                <span className={ 'empty-state-ring' }><CompareArrowsIcon /></span>
                <h2>Compare measurements</h2>
                <p className={ 'empty-state-hint' }>
                    Tick the checkboxes next to measurements in the library, or use a folder&apos;s &quot;Compare all&quot;.
                </p>
                <div className={ 'empty-state-actions' }>
                    <button className={ 'primary' }
                        onClick={ () => setSidebarOpen(true) }>Open library</button>
                </div>
            </div>
        );
    }

    return (
        <div className={ 'view compare-view' }>
            <div className={ 'view-header' }>
                <div className={ 'view-heading' }>
                    <span className={ 'view-breadcrumb' }>Comparison</span>
                    <h2 className={ 'view-title' }>
                        {compare.length} measurement{compare.length === 1 ? '' : 's'}
                    </h2>
                    <span className={ 'view-meta' }>Aligned by time since each recording started</span>
                </div>
                <div className={ 'view-actions' }>
                    <button className={ 'border' }
                        onClick={ clearCompare }>Clear</button>
                </div>
            </div>

            <ul className={ 'compare-legend' }
                aria-label={ 'Legend' }>
                {compare.map(entry => {
                    const tracking = trackings.find(t => t.id === entry.id);
                    if (!tracking) {
                        return null;
                    }
                    return (
                        <li key={ entry.id }
                            className={ 'compare-chip' }>
                            <span className={ 'compare-swatch' }
                                style={ { background: entry.color } } />
                            <button className={ 'transparent compare-chip-name' }
                                onClick={ () => openMeasurement(entry.id) }
                                title={ 'Open measurement' }>
                                {tracking.name}
                            </button>
                            <button className={ 'circle transparent small' }
                                onClick={ () => toggleCompare(entry.id) }
                                aria-label={ `Remove ${ tracking.name } from comparison` }>
                                <CloseIcon fontSize={ 'small' } />
                            </button>
                        </li>
                    );
                })}
            </ul>

            {compare.length === 1 && (
                <p className={ 'compare-hint' }>Add another measurement from the library to compare against.</p>
            )}

            <div className={ `compare-chart ${ isLoading ? 'loading' : '' }` }>
                <XYChart xScale={ { type: 'linear', domain: [0, xMax] } }
                    yScale={ { type: 'linear', domain: yDomain, zero: false } }
                    // The legend sits above the chart, so the default 50px top
                    // margin is just dead space.
                    margin={ { top: 16, right: 24, bottom: 40, left: 48 } }>
                    <GapBands gaps={ series.length === 1 ? series[0].gaps : [] } />

                    <Grid strokeDasharray={ '2 4' }
                        stroke={ '#2c2c2a' }
                        numTicks={ 5 } />

                    {series.flatMap(s => s.segments.map((segment, i) => (
                        <LineSeries
                            key={ segmentKey(s.tracking.id, i) }
                            dataKey={ segmentKey(s.tracking.id, i) }
                            data={ segment }
                            xAccessor={ xAccessor }
                            yAccessor={ yAccessor }
                            stroke={ s.color }
                            strokeWidth={ 2 }
                        />
                    )))}

                    <Axis
                        numTicks={ 6 }
                        tickFormat={ (d: number) => formatElapsed(d) }
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

                    <Tooltip<Bucket>
                        snapTooltipToDatumX={ true }
                        showVerticalCrosshair={ true }
                        verticalCrosshairStyle={ { stroke: '#66655f', strokeWidth: 1 } }
                        className={ 'chart-tooltip' }
                        unstyled={ true }
                        applyPositionStyle={ true }
                        renderTooltip={ ({ tooltipData }) => {
                            const x = tooltipData?.nearestDatum?.datum?.timestamp;
                            if (x === undefined) {
                                return null;
                            }
                            // datumByKey holds the nearest point of *every* segment,
                            // however far away -- keep the closest one per measurement,
                            // and only if it's actually near the hovered time.
                            const tolerance = xMax / COMPARE_CHART_POINTS * 2;
                            const nearest = new Map<string, Bucket>();
                            for (const { key, datum } of Object.values(tooltipData?.datumByKey ?? {})) {
                                const id = key.split('::')[0];
                                const current = nearest.get(id);
                                if (datum && Math.abs(datum.timestamp - x) <= tolerance
                                    && (!current || Math.abs(datum.timestamp - x) < Math.abs(current.timestamp - x))) {
                                    nearest.set(id, datum);
                                }
                            }
                            return (
                                <>
                                    <div className={ 'chart-tooltip-title' }>{formatElapsed(x)} elapsed</div>
                                    {compare.filter(e => nearest.has(e.id)).map(e => (
                                        <div key={ e.id }
                                            className={ 'chart-tooltip-row' }>
                                            <span className={ 'chart-tooltip-swatch' }
                                                style={ { background: e.color } } />
                                            <span className={ 'chart-tooltip-name' }>{seriesById.get(e.id)?.tracking.name}</span>
                                            <strong>{nearest.get(e.id)?.value.toFixed(2)}</strong>
                                        </div>
                                    ))}
                                </>
                            );
                        } } />
                </XYChart>
            </div>

            <div className={ 'compare-table-wrapper' }>
                <table className={ 'compare-table' }>
                    <thead>
                        <tr>
                            <th>Measurement</th>
                            <th>Recorded</th>
                            <th>Duration</th>
                            <th className={ 'num' }>Mean</th>
                            <th className={ 'num' }>Drift</th>
                            <th className={ 'num' }
                                title={ 'Standard deviation of the speed — lower is steadier' }>Std dev</th>
                            <th className={ 'num' }>Min</th>
                            <th className={ 'num' }>Max</th>
                        </tr>
                    </thead>
                    <tbody>
                        {series.map(({ tracking, color, stats, durationMs }) => {
                            const folder = folders.find(f => f.id === tracking.folderId);
                            return (
                                <tr key={ tracking.id }>
                                    <td>
                                        <span className={ 'compare-table-name' }>
                                            <span className={ 'compare-swatch' }
                                                style={ { background: color } } />
                                            <span>
                                                {tracking.name}
                                                <small>{folder ? folderLabel(folder) : 'Unfiled'}</small>
                                            </span>
                                        </span>
                                    </td>
                                    <td>{new Date(tracking.startedAt).toLocaleDateString()}</td>
                                    <td>{humanizeDuration(durationMs)}</td>
                                    {stats ? (
                                        <>
                                            <td className={ 'num' }>{stats.mean.toFixed(3)}</td>
                                            <td className={ 'num' }>
                                                <span className={ `stat-offset status-${ statusFor(offsetPercentage(stats.mean, stats.target)) }` }>
                                                    <span className={ 'status-dot' } />
                                                    {formatSigned(stats.driftPercent, 2)}%
                                                </span>
                                            </td>
                                            <td className={ 'num' }>{stats.stdDev.toFixed(3)}</td>
                                            <td className={ 'num' }>{stats.min.toFixed(2)}</td>
                                            <td className={ 'num' }>{stats.max.toFixed(2)}</td>
                                        </>
                                    ) : (
                                        <td className={ 'compare-table-nodata' }
                                            colSpan={ 5 }>Never reached speed</td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
