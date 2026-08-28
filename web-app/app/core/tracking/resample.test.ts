import {describe, expect, it} from 'vitest';
import {bucketDurationFor, GAP_THRESHOLD_MS, resampleSamples, segmentBuckets, TARGET_CHART_POINTS} from './resample';
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
