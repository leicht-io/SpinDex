import { describe, expect, it } from 'vitest';
import { formatClock, humanizeDuration } from './time';

describe('formatClock', () => {
    const date = new Date(2026, 0, 2, 7, 5, 9);

    it('formats hours and minutes, zero-padded', () => {
        expect(formatClock(date, false)).toBe('07:05');
    });

    it('appends seconds when asked', () => {
        expect(formatClock(date, true)).toBe('07:05:09');
    });
});

describe('humanizeDuration', () => {
    const s = 1000;
    const m = 60 * s;
    const h = 60 * m;
    const d = 24 * h;

    it.each([
        [0, 'a few seconds'],
        [44 * s, 'a few seconds'],
        [45 * s, 'a minute'],
        [89 * s, 'a minute'],
        [90 * s, '2 minutes'],
        [44 * m, '44 minutes'],
        [45 * m, 'an hour'],
        [90 * m, '2 hours'],
        [21 * h, '21 hours'],
        [22 * h, 'a day'],
        [36 * h, '2 days'],
        [25 * d, '25 days'],
        [26 * d, 'a month'],
        [400 * d, 'a year'],
        [800 * d, '2 years'],
    ])('%i ms -> %s', (ms, expected) => {
        expect(humanizeDuration(ms)).toBe(expected);
    });
});
