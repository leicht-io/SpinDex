import * as React from 'react';
import {ITrackingContextProps, ITrackingProviderProps, WindowOption} from './types';
import {
    addSample,
    bulkAddSamples,
    createTracking,
    deleteTracking as dbDeleteTracking,
    getActiveTracking,
    getAllSamples,
    getSamplesInRange,
    listTrackings,
    stopTracking as dbStopTracking,
    Tracking,
} from '../../core/storage/db';
import {Bucket, bucketDurationFor, Gap, resampleSamples} from '../../core/tracking/resample';
import {downloadTrackingCsv} from '../../core/tracking/csv';
import {generateMockSamples} from '../../core/tracking/mock';

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
            const {buckets, gaps} = resampleSamples(samples, bucketMs);

            if (!cancelled) {
                setChartBuckets(buckets);
                setChartGaps(gaps);
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

    const startTracking = async (): Promise<void> => {
        const tracking = await createTracking();
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
            min: Math.min(t.min, value),
            max: Math.max(t.max, value),
        } : t)));

        addSample(id, timestamp, value).catch(err => console.error('Failed to persist sample', err));
    };

    // Dev-tools only (see components/DevTools): backfills a full 24h
    // tracking with realistic mock samples — including gaps — in one bulk
    // insert, then switches the view to it.
    const loadMockDataset = async (): Promise<void> => {
        const durationMs = 24 * 60 * 60 * 1000;
        const startedAt = Date.now() - durationMs;
        const stoppedAt = Date.now();

        const tracking = await createTracking(`Mock 24h — ${new Date(startedAt).toLocaleString()}`, startedAt, stoppedAt);
        const samples = generateMockSamples(startedAt, durationMs);
        await bulkAddSamples(tracking.id, samples);

        // Not Math.min(...values)/Math.max(...values) — spreading ~166k
        // args into Math.min/max blows V8's call stack.
        let min = Infinity;
        let max = -Infinity;
        for (const sample of samples) {
            min = Math.min(min, sample.value);
            max = Math.max(max, sample.value);
        }

        const populated: Tracking = {
            ...tracking,
            sampleCount: samples.length,
            min,
            max,
        };

        setTrackings(prev => [populated, ...prev]);
        setViewingTrackingId(populated.id);
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
            isLoadingChart,
            startTracking,
            stopTracking,
            deleteTracking,
            exportTracking,
            viewTracking,
            recordSample,
            loadMockDataset,
        }}>
            {props.children}
        </TrackingContext.Provider>
    );
};

export const TrackingConsumer = TrackingContext.Consumer;
