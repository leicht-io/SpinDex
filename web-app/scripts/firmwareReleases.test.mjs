import { describe, expect, it } from 'vitest';
import { compareVersions, firmwareIndex, firmwareReleases } from './firmwareReleases.mjs';

const release = (tag, extra = {}) => ({
    tag_name: tag,
    draft: false,
    prerelease: false,
    published_at: '2026-10-24T12:00:00Z',
    html_url: `https://github.com/leicht-io/SpinDex/releases/tag/${ tag }`,
    assets: [
        { name: 'manifest.json', browser_download_url: `https://example.test/${ tag }/manifest.json` },
        { name: 'firmware.bin', browser_download_url: `https://example.test/${ tag }/firmware.bin` },
    ],
    ...extra,
});

describe('compareVersions', () => {
    it('orders dotted versions numerically', () => {
        expect(compareVersions('2.10.0', '2.9.0')).toBeGreaterThan(0);
        expect(compareVersions('2.4.0', '2.4.1')).toBeLessThan(0);
        expect(compareVersions('2.4', '2.4.0')).toBe(0);
    });

    it('puts a pre-release before its release, and ignores build metadata', () => {
        expect(compareVersions('2.5.0-rc1', '2.5.0')).toBeLessThan(0);
        expect(compareVersions('2.5.0-rc1', '2.5.0-rc2')).toBeLessThan(0);
        expect(compareVersions('2.5.0+abc', '2.5.0')).toBe(0);
    });
});

describe('firmwareReleases', () => {
    it('keeps published releases with firmware, newest first', () => {
        const picked = firmwareReleases([release('v2.4.0'), release('v2.10.0'), release('v2.5.0')]);

        expect(picked.map(r => r.version)).toEqual(['2.10.0', '2.5.0', '2.4.0']);
        expect(picked[0].assets.get('firmware.bin')).toBe('https://example.test/v2.10.0/firmware.bin');
        expect(picked[0].date).toBe('2026-10-24');
    });

    it('skips drafts, pre-releases, releases without firmware and odd tags', () => {
        expect(firmwareReleases([
            release('v2.5.0', { draft: true }),
            release('v2.6.0', { prerelease: true }),
            release('v2.3.0', { assets: [] }),
            release('nightly/../x'),
        ])).toEqual([]);
    });
});

describe('firmwareIndex', () => {
    it('lists each version with its date and release page', () => {
        expect(firmwareIndex(firmwareReleases([release('v2.4.0')]))).toEqual({
            versions: [{ version: '2.4.0', date: '2026-10-24', url: 'https://github.com/leicht-io/SpinDex/releases/tag/v2.4.0' }],
        });
    });
});
