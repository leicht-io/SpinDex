import {describe, expect, it} from 'vitest';
import {
    bucketDurationFor,
    Bucket,
    GAP_THRESHOLD_MS,
    resampleSamples,
    segmentBuckets,
    TARGET_CHART_POINTS,
    yAxisDomain,
} from './resample';
import {sample} from './testFixtures';

describe('bucketDurationFor', () => {
    it('never returns less than the 1s floor, even for a tiny span', () => {
        expect(bucketDurationFor(10)).toBe(1_000);
    });

    it('divides the span across the default point budget', () => {
        const spanMs = 24 * 60 * 60 * 1000;
        expect(bucketDurationFor(spanMs)).toBe(Math.ceil(spanMs / TARGET_CHART_POINTS));
    });

    it('honors a custom target point count', () => {
        expect(bucketDurationFor(10_000, 10)).toBe(1_000);
    });
});

describe('resampleSamples', () => {
    it('returns empty buckets and gaps for no samples', () => {
        expect(resampleSamples([], 1_000)).toEqual({buckets: [], gaps: []});
    });

    it('sorts out-of-order input before bucketing', () => {
        const samples = [sample(2_000, 20), sample(0, 10)];
        const {buckets} = resampleSamples(samples, 10_000);

        expect(buckets).toHaveLength(1);
        expect(buckets[0].value).toBeCloseTo(15);
    });

    it('averages value/timestamp and tracks min/max within one bucket', () => {
        const samples = [sample(0, 10), sample(100, 20), sample(200, 30)];
        const {buckets} = resampleSamples(samples, 10_000);

        expect(buckets).toHaveLength(1);
        expect(buckets[0]).toEqual({timestamp: 100, value: 20, min: 10, max: 30});
    });

    it('splits samples spanning multiple bucket widths into separate buckets', () => {
        const samples = [sample(0, 1), sample(500, 2), sample(1_000, 3), sample(1_500, 4)];
        const {buckets} = resampleSamples(samples, 1_000);

        expect(buckets).toHaveLength(2);
        expect(buckets[0].value).toBeCloseTo(1.5);
        expect(buckets[1].value).toBeCloseTo(3.5);
    });

    it('flags a run of missing time above the gap threshold', () => {
        const gapStart = 0;
        const gapEnd = GAP_THRESHOLD_MS + 1;
        const samples = [sample(gapStart, 10), sample(gapEnd, 20)];
        const {gaps} = resampleSamples(samples, 1_000);

        expect(gaps).toEqual([{start: gapStart, end: gapEnd}]);
    });

    it('does not flag a jump at or below the gap threshold', () => {
        const samples = [sample(0, 10), sample(GAP_THRESHOLD_MS, 20)];
        const {gaps} = resampleSamples(samples, 1_000);

        expect(gaps).toEqual([]);
    });

    it('drops non-finite readings instead of letting them poison a bucket', () => {
        // A NaN (or Infinity) reading averaged into a bucket would turn that
        // whole bucket's value to NaN, which then invalidates the SVG path
        // it's plotted in — hiding the entire line, not just that point.
        const samples = [sample(0, 10), sample(100, NaN), sample(200, 30)];
        const {buckets} = resampleSamples(samples, 10_000);

        expect(buckets).toHaveLength(1);
        expect(buckets[0].value).toBeCloseTo(20);
    });

    it('flags a trailing gap from the last sample to "now" when live', () => {
        // Without liveEndBoundary there's no "next" sample yet to compare
        // the last one against, so a live BLE drop wouldn't show as a gap
        // until reconnecting delivered a following sample.
        const samples = [sample(0, 10)];
        const now = GAP_THRESHOLD_MS + 1;
        const {gaps} = resampleSamples(samples, 1_000, now);

        expect(gaps).toEqual([{start: 0, end: now}]);
    });

    it('does not flag a trailing gap that has not crossed the threshold yet', () => {
        const samples = [sample(0, 10)];
        const {gaps} = resampleSamples(samples, 1_000, GAP_THRESHOLD_MS);

        expect(gaps).toEqual([]);
    });

    it('does not flag a trailing gap when not viewing live (no liveEndBoundary)', () => {
        const samples = [sample(0, 10)];
        const {gaps} = resampleSamples(samples, 1_000);

        expect(gaps).toEqual([]);
    });
});

describe('segmentBuckets', () => {
    const b = (timestamp: number): {timestamp: number; value: number; min: number; max: number} =>
        ({timestamp, value: 0, min: 0, max: 0});

    it('returns no segments for no buckets', () => {
        expect(segmentBuckets([], [])).toEqual([]);
    });

    it('keeps all buckets in one segment when there are no gaps', () => {
        const buckets = [b(0), b(1_000), b(2_000)];
        expect(segmentBuckets(buckets, [])).toEqual([buckets]);
    });

    it('starts a new segment at a gap between two consecutive buckets', () => {
        const buckets = [b(0), b(1_000), b(10_000), b(11_000)];
        const gaps = [{start: 1_000, end: 10_000}];

        expect(segmentBuckets(buckets, gaps)).toEqual([
            [buckets[0], buckets[1]],
            [buckets[2], buckets[3]],
        ]);
    });

    it('does not split on a gap that falls outside any consecutive pair', () => {
        const buckets = [b(0), b(1_000)];
        const gaps = [{start: 5_000, end: 6_000}];

        expect(segmentBuckets(buckets, gaps)).toEqual([buckets]);
    });
});

describe('yAxisDomain', () => {
    const bucket = (min: number, max: number): Bucket => ({timestamp: 0, value: (min + max) / 2, min, max});

    it('centers a fallback range on target when there is no data yet', () => {
        const [lo, hi] = yAxisDomain([], 33.33);

        expect((lo + hi) / 2).toBeCloseTo(33.33);
        expect(hi - lo).toBeGreaterThan(0);
    });

    it('zooms to the buckets\' actual min/max, not just their averaged value', () => {
        const buckets = [bucket(33.1, 33.2), bucket(33.5, 33.6)];
        const [lo, hi] = yAxisDomain(buckets, 33.33);

        // Extent is [33.1, 33.6] -- padded, so strictly wider, but centered
        // on the same midpoint rather than on target.
        expect((lo + hi) / 2).toBeCloseTo((33.1 + 33.6) / 2);
        expect(lo).toBeLessThan(33.1);
        expect(hi).toBeGreaterThan(33.6);
    });

    it('does not zoom tighter than the minimum span for a rock-steady run', () => {
        const buckets = [bucket(33.33, 33.33), bucket(33.33, 33.33)];
        const [lo, hi] = yAxisDomain(buckets, 33.33);

        expect(hi - lo).toBeGreaterThanOrEqual(33.33 * 0.08);
    });

    it('widens to include an in-view stall/ramp-up rather than clipping it', () => {
        const buckets = [bucket(0, 0), bucket(33.3, 33.4)];
        const [lo, hi] = yAxisDomain(buckets, 33.33);

        expect(lo).toBeLessThanOrEqual(0);
        expect(hi).toBeGreaterThanOrEqual(33.4);
    });
});
