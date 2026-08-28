import {Sample} from '../storage/db';

// Above this, a jump between consecutive samples is treated as a real gap
// (disconnect, app closed, laptop asleep) rather than normal ~0.5s sample
// jitter — comfortably above the firmware's ~520ms emit interval.
export const GAP_THRESHOLD_MS = 5_000;

// Chart point budget: bucket width is derived from the visible span so a
// 10-minute window and a 24h window both render around this many points,
// rather than the point count scaling with however long the tracking ran.
export const TARGET_CHART_POINTS = 600;
const MIN_BUCKET_MS = 1_000;

export interface Bucket {
    timestamp: number;
    value: number;
    min: number;
    max: number;
}

export interface Gap {
    start: number;
    end: number;
}

export interface ResampleResult {
    buckets: Bucket[];
    gaps: Gap[];
}

export const bucketDurationFor = (spanMs: number, targetPoints: number = TARGET_CHART_POINTS): number =>
    Math.max(MIN_BUCKET_MS, Math.ceil(spanMs / targetPoints));

/**
 * Buckets raw samples into `bucketMs`-wide averages and detects gaps (runs
 * of time with no samples at all, above GAP_THRESHOLD_MS).
 */
export const resampleSamples = (samples: Sample[], bucketMs: number): ResampleResult => {
    if (samples.length === 0) {
        return {buckets: [], gaps: []};
    }

    const sorted = [...samples].sort((a, b) => a.timestamp - b.timestamp);

    const gaps: Gap[] = [];
    for (let i = 1; i < sorted.length; i++) {
        const delta = sorted[i].timestamp - sorted[i - 1].timestamp;
        if (delta > GAP_THRESHOLD_MS) {
            gaps.push({start: sorted[i - 1].timestamp, end: sorted[i].timestamp});
        }
    }

    const buckets: Bucket[] = [];
    let bucketStart = sorted[0].timestamp;
    let bucketSum = 0;
    let bucketMin = Infinity;
    let bucketMax = -Infinity;
    let bucketCount = 0;
    let bucketTimeSum = 0;

    const flushBucket = () => {
        if (bucketCount === 0) {
            return;
        }
        buckets.push({
            timestamp: bucketTimeSum / bucketCount,
            value: bucketSum / bucketCount,
            min: bucketMin,
            max: bucketMax,
        });
        bucketSum = 0;
        bucketMin = Infinity;
        bucketMax = -Infinity;
        bucketCount = 0;
        bucketTimeSum = 0;
    };

    for (const sample of sorted) {
        while (sample.timestamp - bucketStart >= bucketMs) {
            flushBucket();
            bucketStart += bucketMs;
        }

        bucketSum += sample.value;
        bucketTimeSum += sample.timestamp;
        bucketMin = Math.min(bucketMin, sample.value);
        bucketMax = Math.max(bucketMax, sample.value);
        bucketCount++;
    }
    flushBucket();

    return {buckets, gaps};
};

/**
 * Splits a bucket series into contiguous runs, breaking wherever a gap sits
 * between two consecutive buckets. @visx/xychart's Series components don't
 * expose a d3-style `defined` accessor to skip missing data within one
 * series, so instead each run is rendered as its own series — no line is
 * ever drawn connecting across a gap because no single series spans one.
 */
export const segmentBuckets = (buckets: Bucket[], gaps: Gap[]): Bucket[][] => {
    if (buckets.length === 0) {
        return [];
    }

    const segments: Bucket[][] = [[buckets[0]]];

    for (let i = 1; i < buckets.length; i++) {
        const prev = buckets[i - 1];
        const curr = buckets[i];
        const crossesGap = gaps.some(g => g.start >= prev.timestamp && g.end <= curr.timestamp);

        if (crossesGap) {
            segments.push([curr]);
        } else {
            segments[segments.length - 1].push(curr);
        }
    }

    return segments;
};
