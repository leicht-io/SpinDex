import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { APP_VERSION, CHANGELOG } from './changelog';

describe('changelog', () => {
    it('leads with the version in package.json', () => {
        expect(APP_VERSION).toBe(pkg.version);
    });

    it('lists versions newest first with valid dates', () => {
        const dates = CHANGELOG.map(entry => entry.date);

        expect(dates.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
        expect([...dates].sort().reverse()).toEqual(dates);
    });
});
