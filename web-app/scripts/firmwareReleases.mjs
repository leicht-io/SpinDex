/*
  Picks the sensor firmware out of the project's GitHub releases, for
  bundle-firmware.mjs. Pure, so it's unit-testable without the network.

  The Release workflow (.github/workflows/release.yml) attaches what `pio
  run -t webbundle` writes -- manifest.json plus the images it lists -- to
  each release, tagged v<version>.
*/

// Same rule as the app's parseFirmwareVersion (core/link/firmwareVersion).
const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/;

// Orders versions like 2.10.0 > 2.9.1 > 2.9.0 > 2.9.0-rc1: numerically by
// dotted part, a pre-release before its release.
export const compareVersions = (a, b) => {
    const split = version => {
        const [core, pre] = version.split('+')[0].split(/-(.*)/s);
        return { parts: core.split('.').map(part => Number.parseInt(part, 10) || 0), pre };
    };
    const left = split(a);
    const right = split(b);
    for (let i = 0; i < Math.max(left.parts.length, right.parts.length); i++) {
        const diff = (left.parts[i] ?? 0) - (right.parts[i] ?? 0);
        if (diff !== 0) {
            return diff;
        }
    }
    if (left.pre === right.pre) {
        return 0;
    }
    if (left.pre === undefined) {
        return 1;
    }
    if (right.pre === undefined) {
        return -1;
    }
    return left.pre < right.pre ? -1 : 1;
};

/**
 * The releases that carry firmware, newest version first, from the GitHub
 * API's list of releases: published (not drafts or pre-releases), tagged
 * v<version>, with a manifest.json asset.
 */
export const firmwareReleases = releases => releases
    .filter(release => !release.draft && !release.prerelease)
    .map((release) => {
        const version = String(release.tag_name ?? '').replace(/^v/, '');
        const assets = new Map((release.assets ?? []).map(asset => [asset.name, asset.browser_download_url]));
        return { version, date: (release.published_at ?? '').slice(0, 10), url: release.html_url, assets };
    })
    .filter(release => VERSION.test(release.version) && release.assets.has('manifest.json'))
    .sort((a, b) => compareVersions(b.version, a.version));

// What the app reads from dist/firmware/index.json (core/firmware).
export const firmwareIndex = releases => ({
    versions: releases.map(({ version, date, url }) => ({ version, date, url })),
});
