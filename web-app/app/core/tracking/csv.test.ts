import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {Tracking} from '../storage/db';
import {downloadTrackingCsv, trackingToCsv} from './csv';
import {sample} from './testFixtures';

describe('trackingToCsv', () => {
    it('emits a header row even with no samples', () => {
        expect(trackingToCsv([])).toBe('timestamp_iso,timestamp_ms,rpm');
    });

    it('sorts samples by timestamp regardless of input order', () => {
        const csv = trackingToCsv([sample(2_000, 20), sample(0, 10)]);
        const rows = csv.split('\n');

        expect(rows).toHaveLength(3);
        expect(rows[1]).toContain(',0,10');
        expect(rows[2]).toContain(',2000,20');
    });

    it('formats each row as iso timestamp, epoch ms, and value', () => {
        const csv = trackingToCsv([sample(0, 33.33)]);
        const [, row] = csv.split('\n');

        expect(row).toBe(`${new Date(0).toISOString()},0,33.33`);
    });
});

describe('downloadTrackingCsv', () => {
    const tracking: Tracking = {
        id: 't1',
        name: 'Test Run 1',
        startedAt: 0,
        stoppedAt: 1_000,
        sampleCount: 1,
        min: 10,
        max: 10,
    };

    beforeEach(() => {
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('triggers a download of a sanitized filename via a temporary link', () => {
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

        downloadTrackingCsv(tracking, [sample(0, 10)]);

        expect(click).toHaveBeenCalledOnce();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
        // The link is removed from the DOM again once the download's kicked off.
        expect(document.querySelector('a[download]')).toBeNull();
    });

    it('sanitizes the tracking name into a safe filename', () => {
        let downloadAttr = '';
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
            downloadAttr = this.download;
        });

        downloadTrackingCsv({...tracking, name: 'Mock 24h — 8/28/2026, 10:00:00 AM'}, []);

        expect(downloadAttr).toBe('Mock_24h_8_28_2026_10_00_00_AM.csv');
    });
});
