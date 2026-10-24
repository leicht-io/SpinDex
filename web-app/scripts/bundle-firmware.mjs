/*
  Puts the sensor firmware into the web app's build, for its firmware
  updater: dist/firmware/<version>/ for each version (what controller-
  source's `webbundle` target writes), and dist/firmware/index.json listing
  them, newest first. The updater offers every listed version, so older
  ones can be installed to downgrade.

  By default (`yarn build`, `yarn firmware`) the versions are the project's
  GitHub releases, which the Release workflow (.github/workflows/
  release.yml) publishes with their firmware; the build stops if this app's
  own version has no release yet. Browsers can't download release assets from another site (GitHub
  sends no CORS headers for them), so they're served from the app's own.

  `--current-from <dir>` takes this app's version from a bundle already
  built there instead (the Release workflow, which publishes it alongside).

  `--local` (`yarn firmware:local`) builds the working copy with PlatformIO
  instead, as the only version: for trying updates with `yarn start`. It
  needs `pio` on the PATH, PlatformIO's own install in ~/.platformio, or
  the PIO env variable.
*/

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareVersions, firmwareIndex, firmwareReleases } from './firmwareReleases.mjs';

const REPOSITORY = process.env.SPINDEX_REPOSITORY ?? 'leicht-io/SpinDex';
// A bare file name, as the app requires (core/firmware/firmwareBundle).
const IMAGE_FILE = /^[A-Za-z0-9_.-]+\.bin$/;

const webApp = join(dirname(fileURLToPath(import.meta.url)), '..');
const controller = join(webApp, '..', 'controller-source');
const firmwareRoot = join(webApp, 'dist', 'firmware');
const { version: appVersion } = JSON.parse(readFileSync(join(webApp, 'package.json'), 'utf8'));

const fail = (message) => {
    console.error(message);
    process.exit(1);
};

const findPio = () => {
    if (process.env.PIO) {
        return process.env.PIO;
    }
    if (spawnSync('pio', ['--version'], { stdio: 'ignore' }).status === 0) {
        return 'pio';
    }
    const ownInstall = join(homedir(), '.platformio', 'penv', 'bin', 'pio');
    if (existsSync(ownInstall)) {
        return ownInstall;
    }
    return fail('PlatformIO not found: install it, or set PIO to its pio executable.');
};

const writeIndex = (index) => {
    writeFileSync(join(firmwareRoot, 'index.json'), `${ JSON.stringify(index, null, 2) }\n`);
};

const bundleLocal = () => {
    // Found before anything is deleted: no PlatformIO, no change to dist/.
    const pio = findPio();
    rmSync(firmwareRoot, { recursive: true, force: true });

    const build = spawnSync(pio, ['run', '-e', 'm5stack-stamps3', '-t', 'webbundle'], {
        cwd: controller,
        stdio: 'inherit',
        env: { ...process.env, SPINDEX_FIRMWARE_DIR: join(firmwareRoot, appVersion) },
    });
    if (build.status !== 0) {
        fail('Building the firmware failed.');
    }
    writeIndex({ versions: [{ version: appVersion, date: new Date().toISOString().slice(0, 10), url: null, local: true }] });
    console.log(`Firmware ${ appVersion } (built from the working copy) is in ${ firmwareRoot }`);
};

const download = async (url, what) => {
    const headers = { 'User-Agent': 'spindex-build' };
    if (process.env.GITHUB_TOKEN && url.startsWith('https://api.github.com/')) {
        headers.Authorization = `Bearer ${ process.env.GITHUB_TOKEN }`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        fail(`Couldn't download ${ what } (HTTP ${ response.status }).`);
    }
    return response;
};

// A release's bundle: its manifest, and each image it lists checked
// against the manifest's size and hash. `read(file)` fetches a file.
const readBundle = async (version, read) => {
    const manifestText = (await read('manifest.json')).toString('utf8');
    const manifest = JSON.parse(manifestText);
    if (manifest.version !== version) {
        fail(`The bundle for ${ version } carries firmware ${ manifest.version }.`);
    }
    const files = [];
    for (const { file, size, sha256 } of manifest.images) {
        if (!IMAGE_FILE.test(file)) {
            fail(`The bundle for ${ version } lists a bad file name: ${ file }`);
        }
        const data = await read(file);
        if (data.length !== size || createHash('sha256').update(data).digest('hex') !== sha256) {
            fail(`The bundle for ${ version }'s ${ file } doesn't match its manifest.`);
        }
        files.push({ file, data });
    }
    return { version, manifestText, files };
};

const bundleReleases = async (currentDir) => {
    let releases = firmwareReleases(await (await download(`https://api.github.com/repos/${ REPOSITORY }/releases?per_page=100`, 'the release list')).json());
    if (currentDir) {
        releases = releases.filter(release => release.version !== appVersion);
    } else if (!releases.some(release => release.version === appVersion)) {
        fail(`No firmware release for ${ appVersion } on github.com/${ REPOSITORY } yet: the Release workflow publishes it when `
            + `the version bump reaches master. (\`yarn build:web\` builds the app alone, \`yarn firmware:local\` bundles the working copy.)`);
    }

    // Read in full before dist/ is touched, so a failure leaves it as it was.
    const bundles = [];
    for (const release of releases) {
        bundles.push(await readBundle(release.version, async (file) => {
            const url = release.assets.get(file);
            if (!url) {
                fail(`Release v${ release.version } has no ${ file }.`);
            }
            return Buffer.from(await (await download(url, `${ release.version }'s ${ file }`)).arrayBuffer());
        }));
    }
    if (currentDir) {
        bundles.push(await readBundle(appVersion, async file => readFileSync(join(currentDir, file))));
        releases = [...releases, {
            version: appVersion,
            date: new Date().toISOString().slice(0, 10),
            url: `https://github.com/${ REPOSITORY }/releases/tag/v${ appVersion }`,
        }].sort((a, b) => compareVersions(b.version, a.version));
    }

    rmSync(firmwareRoot, { recursive: true, force: true });
    for (const { version, manifestText, files } of bundles) {
        const dir = join(firmwareRoot, version);
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'manifest.json'), manifestText);
        for (const { file, data } of files) {
            writeFileSync(join(dir, file), data);
        }
    }
    writeIndex(firmwareIndex(releases));
    console.log(`Firmware ${ releases.map(release => release.version).join(', ') } is in ${ firmwareRoot }`);
};

const currentFlag = process.argv.indexOf('--current-from');
if (process.argv.includes('--local')) {
    bundleLocal();
} else if (currentFlag !== -1 && !process.argv[currentFlag + 1]) {
    fail('--current-from needs the folder of the bundle to include.');
} else {
    await bundleReleases(currentFlag === -1 ? undefined : process.argv[currentFlag + 1]);
}
