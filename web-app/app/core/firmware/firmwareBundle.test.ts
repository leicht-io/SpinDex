import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { firmwareBundleUrl, flashProgress, loadFirmwareBundle, loadFirmwareIndex, parseFirmwareIndex, parseFirmwareManifest } from './firmwareBundle';

const BOOTLOADER = new Uint8Array([1, 2, 3]);
const APP = new Uint8Array([4, 5]);
const image = (file: string, offset: number, data: Uint8Array): object => ({
    file,
    offset,
    size: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
});

const MANIFEST = {
    version: '2.4.0',
    flashMode: 'dio',
    flashFreq: '80m',
    flashSize: '8MB',
    images: [image('bootloader.bin', 0, BOOTLOADER), image('firmware.bin', 0x10000, APP)],
};

// Serves `files` by name; anything else gets `fallback` (a 404, or a host's
// index page).
const fakeFetch = (files: Record<string, unknown>, fallback = new Response('', { status: 404 })): typeof fetch => (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    expect(init?.cache).toBe('no-cache');
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
    const name = url.split('/').pop() ?? '';
    // eslint-disable-next-line security/detect-object-injection -- test fixture lookup
    const body = files[name];
    if (body === undefined) {
        return Promise.resolve(fallback.clone());
    }
    return Promise.resolve(new Response(body instanceof Uint8Array ? body as Uint8Array<ArrayBuffer> : JSON.stringify(body)));
};

const BASE = 'https://spindex.leicht.io/';

describe('firmwareBundleUrl', () => {
    it('puts each version in its own folder next to the page', () => {
        expect(firmwareBundleUrl('2.4.0', BASE).toString()).toBe('https://spindex.leicht.io/firmware/2.4.0/');
    });
});

describe('parseFirmwareManifest', () => {
    it('reads a manifest', () => {
        const manifest = parseFirmwareManifest(MANIFEST, '2.4.0');
        expect(manifest.flashSize).toBe('8MB');
        expect(manifest.images.map(entry => entry.file)).toEqual(['bootloader.bin', 'firmware.bin']);
    });

    it('rejects firmware for another version', () => {
        expect(() => parseFirmwareManifest(MANIFEST, '2.5.0')).toThrow('not 2.5.0');
    });

    it('rejects image paths that leave the folder', () => {
        const manifest = { ...MANIFEST, images: [{ ...image('x.bin', 0, APP), file: '../../evil.bin' }] };
        expect(() => parseFirmwareManifest(manifest, '2.4.0')).toThrow('malformed image entry');
    });

    it('rejects malformed image entries', () => {
        const bad = (patch: object): object => ({ ...MANIFEST, images: [{ ...image('a.bin', 0, APP), ...patch }] });
        expect(() => parseFirmwareManifest(bad({ offset: -1 }), '2.4.0')).toThrow('malformed');
        expect(() => parseFirmwareManifest(bad({ size: 0 }), '2.4.0')).toThrow('malformed');
        expect(() => parseFirmwareManifest(bad({ sha256: 'abc' }), '2.4.0')).toThrow('malformed');
        expect(() => parseFirmwareManifest({ ...MANIFEST, images: [] }, '2.4.0')).toThrow('no images');
        expect(() => parseFirmwareManifest(null, '2.4.0')).toThrow();
    });
});

describe('parseFirmwareIndex', () => {
    it('reads the versions on offer, keeping their order', () => {
        expect(parseFirmwareIndex({
            versions: [
                { version: '2.5.0', date: '2026-11-02', url: 'https://github.com/leicht-io/SpinDex/releases/tag/v2.5.0' },
                { version: '2.4.0', date: '2026-10-24', url: null, local: true },
            ],
        })).toEqual([
            { version: '2.5.0', date: '2026-11-02', url: 'https://github.com/leicht-io/SpinDex/releases/tag/v2.5.0', local: false },
            { version: '2.4.0', date: '2026-10-24', url: null, local: true },
        ]);
    });

    it('drops malformed and duplicate entries, and links only to GitHub', () => {
        expect(parseFirmwareIndex({
            versions: [
                { version: '../2.4.0', date: '2026-10-24' },
                { version: '2.4.0', date: 'yesterday' },
                { version: '2.4.0', date: '2026-10-24', url: 'javascript:alert(1)' },
                { version: '2.4.0', date: '2026-10-25' },
            ],
        })).toEqual([{ version: '2.4.0', date: '2026-10-24', url: null, local: false }]);
        expect(() => parseFirmwareIndex({})).toThrow('malformed');
    });
});

describe('loadFirmwareIndex', () => {
    it('says so when the build has no firmware, or an empty index', async () => {
        await expect(loadFirmwareIndex(BASE, fakeFetch({}))).rejects.toThrow('no sensor firmware bundled');
        await expect(loadFirmwareIndex(BASE, fakeFetch({}, new Response('<!DOCTYPE html>', { status: 200 })))).rejects.toThrow('no sensor firmware bundled');
        await expect(loadFirmwareIndex(BASE, fakeFetch({ 'index.json': { versions: [] } }))).rejects.toThrow('no sensor firmware bundled');
    });

    it('fetches index.json from the firmware folder', async () => {
        const releases = await loadFirmwareIndex(BASE, fakeFetch({ 'index.json': { versions: [{ version: '2.4.0', date: '2026-10-24', url: null }] } }));
        expect(releases.map(release => release.version)).toEqual(['2.4.0']);
    });
});

describe('loadFirmwareBundle', () => {
    it('downloads the manifest and every image, uncached', async () => {
        const bundle = await loadFirmwareBundle('2.4.0', BASE, fakeFetch({
            'manifest.json': MANIFEST,
            'bootloader.bin': BOOTLOADER,
            'firmware.bin': APP,
        }));

        expect(bundle.images.map(entry => [entry.offset, Array.from(entry.data)])).toEqual([[0, [1, 2, 3]], [0x10000, [4, 5]]]);
    });

    it('says so when the build has no firmware', async () => {
        await expect(loadFirmwareBundle('2.4.0', BASE, fakeFetch({}))).rejects.toThrow('no sensor firmware bundled');
    });

    it('says so when the host answers with its index page instead', async () => {
        const indexPage = new Response('<!DOCTYPE html><html></html>', { status: 200 });
        await expect(loadFirmwareBundle('2.4.0', BASE, fakeFetch({}, indexPage))).rejects.toThrow('no sensor firmware bundled');
    });

    it('never flashes an image that doesn’t match the manifest', async () => {
        const indexPage = new Response('<!DOCTYPE html><html></html>', { status: 200 });
        await expect(loadFirmwareBundle('2.4.0', BASE, fakeFetch({ 'manifest.json': MANIFEST, 'bootloader.bin': BOOTLOADER }, indexPage)))
            .rejects.toThrow('damaged or out of date (firmware.bin)');
        await expect(loadFirmwareBundle('2.4.0', BASE, fakeFetch({ 'manifest.json': MANIFEST, 'bootloader.bin': new Uint8Array([1, 2, 4]), 'firmware.bin': APP })))
            .rejects.toThrow('damaged or out of date (bootloader.bin)');
    });
});

describe('flashProgress', () => {
    const images = [{ data: new Uint8Array(100) }, { data: new Uint8Array(300) }];

    it('weighs each image by its size', () => {
        expect(flashProgress(images, 0, 0, 50)).toBe(0);
        expect(flashProgress(images, 0, 50, 50)).toBe(0.25);
        // Compressed sizes only give the fraction of the image written.
        expect(flashProgress(images, 1, 10, 20)).toBe(0.625);
        expect(flashProgress(images, 1, 20, 20)).toBe(1);
    });

    it('stays within 0-1', () => {
        expect(flashProgress(images, 1, 30, 20)).toBe(1);
        expect(flashProgress([], 0, 0, 0)).toBe(0);
    });
});
