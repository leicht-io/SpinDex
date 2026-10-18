import { describe, expect, it } from 'vitest';
import { computeStats, formatElapsed, isAtSpeed, nominalTarget, statusFor, toElapsed } from './stats';
import { sample } from './testFixtures';

describe('nominalTarget', () => {
    it('picks whichever of 33⅓ and 45 is closer', () => {
        expect(nominalTarget(33.1)).toBe(33.33);
        expect(nominalTarget(44.8)).toBe(45);
    });
});

describe('statusFor', () => {
    it('bands offsets into good/warning/serious/critical', () => {
        expect(statusFor(0.2)).toBe('good');
        expect(statusFor(1)).toBe('warning');
        expect(statusFor(2)).toBe('serious');
        expect(statusFor(5)).toBe('critical');
    });
});

describe('isAtSpeed', () => {
    it('accepts readings near either nominal speed', () => {
        expect(isAtSpeed(33.1)).toBe(true);
        expect(isAtSpeed(46)).toBe(true);
    });

    it('rejects stopped, spin-up and non-finite readings', () => {
        expect(isAtSpeed(0)).toBe(false);
        expect(isAtSpeed(20)).toBe(false);
        expect(isAtSpeed(Number.NaN)).toBe(false);
    });
});

describe('computeStats', () => {
    it('returns null when it never reached speed', () => {
        expect(computeStats([])).toBeNull();
        expect(computeStats([sample(0, 0), sample(1, 15)])).toBeNull();
    });

    it('ignores stopped and spin-up readings', () => {
        const stats = computeStats([sample(0, 0), sample(1, 12), sample(2, 33), sample(3, 34), sample(4, 0)]);

        expect(stats?.mean).toBeCloseTo(33.5);
        expect(stats?.min).toBe(33);
        expect(stats?.max).toBe(34);
        expect(stats?.atSpeedCount).toBe(2);
    });

    it('computes population standard deviation', () => {
        const stats = computeStats([sample(0, 32), sample(1, 34)]);

        expect(stats?.stdDev).toBeCloseTo(1);
    });

    it('reports zero deviation for a constant run', () => {
        const stats = computeStats([sample(0, 33.33), sample(1, 33.33), sample(2, 33.33)]);

        expect(stats?.stdDev).toBe(0);
        expect(stats?.driftPercent).toBeCloseTo(0);
    });

    it('signs drift by direction from the nominal speed', () => {
        expect(computeStats([sample(0, 45.45)])?.driftPercent).toBeCloseTo(1);
        expect(computeStats([sample(0, 44.55)])?.driftPercent).toBeCloseTo(-1);
    });
});

describe('toElapsed', () => {
    it('re-bases timestamps to the start of the measurement', () => {
        expect(toElapsed([sample(1_500, 33)], 1_000)).toEqual([sample(500, 33)]);
    });
});

describe('formatElapsed', () => {
    it('formats minutes and seconds, adding hours when needed', () => {
        expect(formatElapsed(0)).toBe('0:00');
        expect(formatElapsed(65_000)).toBe('1:05');
        expect(formatElapsed(3_909_000)).toBe('1:05:09');
    });
});
