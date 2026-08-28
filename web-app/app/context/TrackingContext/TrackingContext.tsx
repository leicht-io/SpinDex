import * as React from 'react';
import {ITrackingContextProps, ITrackingProviderProps, WindowOption} from './types';
import {
    addSample,
    createTracking,
    deleteTracking as dbDeleteTracking,
    getActiveTracking,
    getAllSamples,
    getSamplesInRange,
    listTrackings,
    renameTracking as dbRenameTracking,
    stopTracking as dbStopTracking,
    Tracking,
} from '../../core/storage/db';
import {Bucket, bucketDurationFor, Gap, resampleSamples} from '../../core/tracking/resample';
import {downloadTrackingCsv} from '../../core/tracking/csv';

export const TrackingContext = React.createContext({} as ITrackingContextProps);

export const WINDOW_OPTIONS: WindowOption[] = [
    {id: 'live', label: 'Live (10 min)', ms: 10 * 60 * 1000},
    {id: '1h', label: '1 hour', ms: 60 * 60 * 1000},
    {id: '6h', label: '6 hours', ms: 6 * 60 * 60 * 1000},
    {id: '12h', label: '12 hours', ms: 12 * 60 * 60 * 1000},
    {id: '24h', label: '24 hours', ms: 24 * 60 * 60 * 1000},
    {id: 'all', label: 'All', ms: null},
];

// Live view re-queries IndexedDB and re-buckets on a timer (rather than
// maintaining a separate incrementally-updated buffer). Wider windows read
// more rows per refresh, so they refresh less often — a 24h chart being a
// few seconds stale is a non-issue; the stat tiles update every sample
// regardless, independent of this.
const refreshIntervalFor = (windowMs: number | null): number => {
    if (windowMs === null || windowMs >= 6 * 60 * 60 * 1000) {
        return 10_000;
    }
    if (windowMs >= 60 * 60 * 1000) {
        return 5_000;
    }
    return 2_000;
};

export const TrackingProvider = (props: ITrackingProviderProps): React.ReactElement => {
    const [trackings, setTrackings] = React.useState<Tracking[]>([]);
    const [activeTrackingId, setActiveTrackingId] = React.useState<string | null>(null);
    const [viewingTrackingId, setViewingTrackingId] = React.useState<string | null>(null);
    const [selectedWindow, setSelectedWindow] = React.useState<WindowOption>(WINDOW_OPTIONS[0]);
    const [latestValue, setLatestValue] = React.useState<number>(0);
    const [chartBuckets, setChartBuckets] = React.useState<Bucket[]>([]);
    const [chartGaps, setChartGaps] = React.useState<Gap[]>([]);
    // Exact [start, end] bounds of the last chart query -- Dashboard uses
    // these as the x-axis domain (rather than deriving it from whatever
    // data happens to be registered) so a live view's axis reaches all the
    // way to "now" even when the tail of it is empty, letting a trailing
    // gap band (see resampleSamples' liveEndBoundary) actually be visible
    // rather than positioned off the edge of an axis that stopped short.
    const [chartRangeStart, setChartRangeStart] = React.useState<number>(Date.now());
    const [chartRangeEnd, setChartRangeEnd] = React.useState<number>(Date.now());
    const [isLoadingChart, setIsLoadingChart] = React.useState<boolean>(false);

    const activeTracking = trackings.find(t => t.id === activeTrackingId) ?? null;
    const viewingTracking = trackings.find(t => t.id === viewingTrackingId) ?? null;

    // Resume-on-load: if a tracking was left running (app closed / refreshed
    // mid-session), pick it back up as the active + viewed tracking rather
    // than losing track of it.
    React.useEffect(() => {
        (async () => {
            const list = await listTrackings();
            setTrackings(list);

            const active = await getActiveTracking();
            if (active) {
                setActiveTrackingId(active.id);
                setViewingTrackingId(active.id);
            } else if (list.length > 0) {
                setViewingTrackingId(list[0].id);
            }
        })();
    }, []);

    // Chart data: recomputed whenever the viewed tracking, its stop state,
    // or the selected window changes — and on an interval while the viewed
    // tracking is the live/active one.
    React.useEffect(() => {
        if (!viewingTracking) {
            setChartBuckets([]);
            setChartGaps([]);
            return;
        }

        let cancelled = false;
        const isLive = activeTracking !== null && viewingTracking.id === activeTracking.id;

        const load = async () => {
            setIsLoadingChart(true);

            const anchor = isLive ? Date.now() : (viewingTracking.stoppedAt ?? Date.now());
            const windowStart = selectedWindow.ms === null
                ? viewingTracking.startedAt
                : Math.max(viewingTracking.startedAt, anchor - selectedWindow.ms);

            const samples = await getSamplesInRange(viewingTracking.id, windowStart, anchor);
            if (cancelled) {
                return;
            }

            const bucketMs = bucketDurationFor(Math.max(1, anchor - windowStart));
            const {buckets, gaps} = resampleSamples(samples, bucketMs, isLive ? anchor : undefined);

            if (!cancelled) {
                setChartBuckets(buckets);
                setChartGaps(gaps);
                setChartRangeStart(windowStart);
                setChartRangeEnd(anchor);
                setIsLoadingChart(false);
            }
        };

        load();

        const intervalId = isLive ? setInterval(load, refreshIntervalFor(selectedWindow.ms)) : undefined;

        return () => {
            cancelled = true;
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewingTracking?.id, viewingTracking?.stoppedAt, activeTracking?.id, selectedWindow]);

    const startTracking = async (name?: string): Promise<void> => {
        const tracking = await createTracking(name || undefined);
        setTrackings(prev => [tracking, ...prev]);
        setActiveTrackingId(tracking.id);
        setViewingTrackingId(tracking.id);
    };

    const stopTracking = async (): Promise<void> => {
        if (!activeTrackingId) {
            return;
        }
        const id = activeTrackingId;
        await dbStopTracking(id);
        setTrackings(prev => prev.map(t => (t.id === id ? {...t, stoppedAt: Date.now()} : t)));
        setActiveTrackingId(null);
    };

    const deleteTracking = async (id: string): Promise<void> => {
        await dbDeleteTracking(id);

        const remaining = trackings.filter(t => t.id !== id);
        setTrackings(remaining);

        if (activeTrackingId === id) {
            setActiveTrackingId(null);
        }

        if (viewingTrackingId === id) {
            const fallbackActive = remaining.find(t => t.stoppedAt === null);
            setViewingTrackingId(fallbackActive?.id ?? remaining[0]?.id ?? null);
        }
    };

    const renameTracking = async (id: string, name: string): Promise<void> => {
        await dbRenameTracking(id, name);
        setTrackings(prev => prev.map(t => (t.id === id ? {...t, name} : t)));
    };

    const exportTracking = async (id: string): Promise<void> => {
        const tracking = trackings.find(t => t.id === id);
        if (!tracking) {
            return;
        }
        const samples = await getAllSamples(id);
        downloadTrackingCsv(tracking, samples);
    };

    const viewTracking = (id: string): void => {
        setViewingTrackingId(id);
    };

    const recordSample = (value: number): void => {
        setLatestValue(value);

        if (!activeTrackingId) {
            return;
        }
        const id = activeTrackingId;
        const timestamp = Date.now();

        setTrackings(prev => prev.map(t => (t.id === id ? {
            ...t,
            sampleCount: t.sampleCount + 1,
            // Number.isFinite guard: self-heal a still-corrupt (NaN/undefined)
            // `sum` on the next sample rather than propagating it forever —
            // see db.ts's addSample for the matching persisted-side guard.
            sum: (Number.isFinite(t.sum) ? t.sum : 0) + value,
            max: Math.max(t.max, value),
        } : t)));

        addSample(id, timestamp, value).catch(err => console.error('Failed to persist sample', err));
    };

    return (
        <TrackingContext.Provider value={{
            trackings,
            activeTracking,
            viewingTracking,
            latestValue,
            windowOptions: WINDOW_OPTIONS,
            selectedWindow,
            setSelectedWindow,
            chartBuckets,
            chartGaps,
            chartRangeStart,
            chartRangeEnd,
            isLoadingChart,
            startTracking,
            stopTracking,
            deleteTracking,
            renameTracking,
            exportTracking,
            viewTracking,
            recordSample,
        }}>
            {props.children}
        </TrackingContext.Provider>
    );
};

export const TrackingConsumer = TrackingContext.Consumer;
