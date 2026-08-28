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

// A y-axis pinned to [0, target] wastes nearly the whole chart height on RPM
// values that never occur once the platter's up to speed — real wow/flutter
// deviations are a fraction of a percent, squeezed into a couple of pixels
// at the top of a 33/45-unit axis. yAxisDomain zooms to what's actually in
// the visible window instead. Don't zoom tighter than this fraction of
// target, so a rock-steady run doesn't turn into a meaningless,
// noise-amplifying sliver.
export const MIN_Y_SPAN_FRACTION = 0.08;
// Padding added around the actual data extent so the line/area doesn't hug
// the top/bottom edge of the chart.
export const Y_AXIS_PADDING_FRACTION = 0.15;

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
 *
 * `liveEndBoundary` (pass "now" when viewing the live tracking) additionally
 * checks the *trailing* edge — the span from the last sample up to right
 * now. Without it, a BLE drop only becomes visible as a gap once
 * reconnecting delivers a following sample far enough away to trip the
 * threshold against; the loop above can't detect it in the meantime since
 * there's no "next" sample yet to compare the last one to.
 */
export const resampleSamples = (samples: Sample[], bucketMs: number, liveEndBoundary?: number): ResampleResult => {
    if (samples.length === 0) {
        return {buckets: [], gaps: []};
    }

    // A non-finite value (NaN/Infinity) landing in one bucket's average
    // would turn that whole bucket, and the SVG path it's plotted in, into
    // "NaN" -- silently hiding the entire line/area for that segment rather
    // than just the one bad point. BLEContext already rejects these at
    // ingestion, but filtering again here guards any sample that made it in
    // before that fix, or via another path (mock/CSV import) later.
    const sorted = samples
        .filter(s => Number.isFinite(s.value))
        .sort((a, b) => a.timestamp - b.timestamp);

    const gaps: Gap[] = [];
    for (let i = 1; i < sorted.length; i++) {
        const delta = sorted[i].timestamp - sorted[i - 1].timestamp;
        if (delta > GAP_THRESHOLD_MS) {
            gaps.push({start: sorted[i - 1].timestamp, end: sorted[i].timestamp});
        }
    }

    const lastTimestamp = sorted[sorted.length - 1].timestamp;
    if (liveEndBoundary !== undefined && liveEndBoundary - lastTimestamp > GAP_THRESHOLD_MS) {
        gaps.push({start: lastTimestamp, end: liveEndBoundary});
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

/**
 * Y-axis range for the chart, zoomed to the visible buckets' actual extent
 * (each bucket's min/max, not just its averaged value, so a brief spike
 * isn't smoothed away) rather than a fixed [0, target] that buries real
 * deviations in a few pixels. `target` centers the fallback range before
 * any data has arrived, and provides the floor for MIN_Y_SPAN_FRACTION so a
 * rock-steady run still gets a sensibly-sized axis.
 */
export const yAxisDomain = (buckets: Bucket[], target: number): [number, number] => {
    const minSpan = target * MIN_Y_SPAN_FRACTION;

    if (buckets.length === 0) {
        return [target - minSpan / 2, target + minSpan / 2];
    }

    let lo = Infinity;
    let hi = -Infinity;
    for (const bucket of buckets) {
        lo = Math.min(lo, bucket.min);
        hi = Math.max(hi, bucket.max);
    }

    const center = (lo + hi) / 2;
    const span = Math.max(hi - lo, minSpan) * (1 + Y_AXIS_PADDING_FRACTION);
    return [center - span / 2, center + span / 2];
};
