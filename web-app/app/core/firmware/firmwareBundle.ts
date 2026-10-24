/*
  The sensor firmware that ships with this build of the app (see
  scripts/bundle-firmware.mjs): an index of the versions on offer -- the
  project's GitHub releases -- and for each, what controller-source's
  `webbundle` target writes: the images a PlatformIO upload flashes, and a
  manifest saying where each goes and what it hashes to.
*/

import type { FlashFreqValues, FlashModeValues, FlashSizeValues } from 'esptool-js';
import { parseFirmwareVersion } from '../link/firmwareVersion';

// A bare file name, so the manifest can't point outside its folder.
const IMAGE_FILE = /^[A-Za-z0-9_.-]+\.bin$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;

const NOT_BUNDLED = 'This build of SpinDex has no sensor firmware bundled.';

export interface FirmwareImage {
    file: string;
    // Flash address it's written to.
    offset: number;
    data: Uint8Array;
}

export interface FirmwareBundle {
    // Checked against what esptool-js can write when the bundle is built
    // (web_bundle.py).
    flashMode: FlashModeValues;
    flashFreq: FlashFreqValues;
    flashSize: FlashSizeValues;
    images: FirmwareImage[];
}

interface ManifestImage {
    file: string;
    offset: number;
    size: number;
    sha256: string;
}

// A version on offer, as dist/firmware/index.json lists it.
export interface FirmwareRelease {
    version: string;
    // ISO date (YYYY-MM-DD) it was released, or built for a local build.
    date: string;
    // Its GitHub release page; null for a local build.
    url: string | null;
    // Built from a working copy (`yarn firmware:local`), not a release.
    local?: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RELEASE_PAGE = /^https:\/\/github\.com\//;

// Where the firmware for `version` is, relative to the page.
export const firmwareBundleUrl = (version: string, base: string): URL => new URL(`firmware/${ version }/`, base);

// The versions in index.json, newest first as listed. Malformed entries
// are dropped rather than failing the lot.
export const parseFirmwareIndex = (json: unknown): FirmwareRelease[] => {
    const entries = ((json ?? {}) as Record<string, unknown>).versions;
    if (!Array.isArray(entries)) {
        throw new Error('The firmware index is malformed.');
    }
    const seen = new Set<string>();
    return entries.flatMap((entry: unknown) => {
        const { version, date, url, local } = (entry ?? {}) as Record<string, unknown>;
        const parsed = typeof version === 'string' ? parseFirmwareVersion(version) : null;
        if (parsed === null || parsed !== version || seen.has(parsed) || typeof date !== 'string' || !ISO_DATE.test(date)) {
            return [];
        }
        seen.add(parsed);
        return [{
            version: parsed,
            date,
            url: typeof url === 'string' && RELEASE_PAGE.test(url) ? url : null,
            local: local === true,
        }];
    });
};

// Checks the manifest is for `version` and its images are well formed. The
// flash settings were checked when it was built.
export const parseFirmwareManifest = (json: unknown, version: string): Omit<FirmwareBundle, 'images'> & { images: ManifestImage[] } => {
    const manifest = (json ?? {}) as Record<string, unknown>;

    if (typeof manifest.version !== 'string' || parseFirmwareVersion(manifest.version) !== version) {
        throw new Error(`The bundled firmware is ${ String(manifest.version) }, not ${ version }.`);
    }
    if (!Array.isArray(manifest.images) || manifest.images.length === 0) {
        throw new Error('The firmware manifest lists no images.');
    }

    const images = manifest.images.map((entry: unknown) => {
        const { file, offset, size, sha256 } = (entry ?? {}) as Record<string, unknown>;
        if (typeof file !== 'string' || !IMAGE_FILE.test(file)
            || typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0
            || typeof size !== 'number' || !Number.isInteger(size) || size <= 0
            || typeof sha256 !== 'string' || !SHA256_HEX.test(sha256)) {
            throw new Error('The firmware manifest has a malformed image entry.');
        }
        return { file, offset, size, sha256 };
    });

    return {
        flashMode: manifest.flashMode as FlashModeValues,
        flashFreq: manifest.flashFreq as FlashFreqValues,
        flashSize: manifest.flashSize as FlashSizeValues,
        images,
    };
};

const sha256Hex = async (data: Uint8Array): Promise<string> => {
    const digest = await crypto.subtle.digest('SHA-256', data as Uint8Array<ArrayBuffer>);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

// Fetches `file` from next to the page, never a cached copy (a rebuilt
// bundle keeps its version's URLs). A missing file is NOT_BUNDLED.
const fetchFirmwareFile = async (url: URL, fetchFn: typeof fetch): Promise<Response> => {
    const response = await fetchFn(url.toString(), { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(response.status === 404 ? NOT_BUNDLED : `Couldn’t download the firmware (${ url.pathname }: HTTP ${ response.status }).`);
    }
    return response;
};

// JSON from next to the page. A host (or Parcel's dev server) that answers
// missing files with the app's index page sends HTML with a 200.
const fetchFirmwareJson = async (url: URL, fetchFn: typeof fetch): Promise<unknown> => {
    try {
        return await (await fetchFirmwareFile(url, fetchFn)).json();
    } catch (error) {
        throw error instanceof SyntaxError ? new Error(NOT_BUNDLED) : error;
    }
};

// The versions this build offers, newest first.
export const loadFirmwareIndex = async (base: string, fetchFn: typeof fetch = fetch): Promise<FirmwareRelease[]> => {
    const releases = parseFirmwareIndex(await fetchFirmwareJson(new URL('firmware/index.json', base), fetchFn));
    if (releases.length === 0) {
        throw new Error(NOT_BUNDLED);
    }
    return releases;
};

/**
 * Fetches the firmware for `version` from next to the page, and checks every image against the manifest's size and hash -- a
 * file left out of an upload, a stale cached one, or a host answering with
 * its index page would otherwise be flashed. Rejects if this build has
 * none (`yarn start` without `yarn firmware` first) or it isn't usable.
 */
export const loadFirmwareBundle = async (version: string, base: string, fetchFn: typeof fetch = fetch): Promise<FirmwareBundle> => {
    const folder = firmwareBundleUrl(version, base);
    const manifest = parseFirmwareManifest(await fetchFirmwareJson(new URL('manifest.json', folder), fetchFn), version);

    const images = await Promise.all(manifest.images.map(async ({ file, offset, size, sha256 }) => {
        const data = new Uint8Array(await (await fetchFirmwareFile(new URL(file, folder), fetchFn)).arrayBuffer());
        if (data.length !== size || await sha256Hex(data) !== sha256) {
            throw new Error(`The downloaded firmware is damaged or out of date (${ file }). Reload the page and try again.`);
        }
        return { file, offset, data };
    }));
    return { ...manifest, images };
};

// One download each per page load: the bundles can't change under a
// running app. A failed load isn't kept, so it can be tried again.
const loads = new Map<string, Promise<unknown>>();
const once = <T>(key: string, load: () => Promise<T>): Promise<T> => {
    let promise = loads.get(key) as Promise<T> | undefined;
    if (!promise) {
        promise = load();
        loads.set(key, promise);
        promise.catch(() => loads.delete(key));
    }
    return promise;
};

export const loadFirmwareIndexOnce = (base: string): Promise<FirmwareRelease[]> => once('index', () => loadFirmwareIndex(base));

export const loadFirmwareBundleOnce = (version: string, base: string): Promise<FirmwareBundle> => once(`bundle:${ version }`, () => loadFirmwareBundle(version, base));

// Overall progress, 0-1, from esptool-js's per-image progress: the bytes of
// the images already written plus `written` of image `index`.
export const flashProgress = (images: { data: Uint8Array }[], index: number, written: number, total: number): number => {
    const sizes = images.map(image => image.data.length);
    const all = sizes.reduce((sum, size) => sum + size, 0);
    if (all === 0) {
        return 0;
    }
    const before = sizes.slice(0, index).reduce((sum, size) => sum + size, 0);
    // `written` and `total` count compressed bytes, so they only give the
    // fraction of that image that's done.
    // eslint-disable-next-line security/detect-object-injection -- index is esptool-js's image number
    const current = total > 0 ? (sizes[index] ?? 0) * Math.min(written / total, 1) : 0;
    return Math.min((before + current) / all, 1);
};
