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

  `--local` (`yarn build`, `yarn firmware:local`) builds this app's version
  from the working copy with PlatformIO, for a build deployed or served
  from here (dist/ is gitignored), and adds the older releases if GitHub
  can be reached. It needs `pio` on the PATH, PlatformIO's own install in
  ~/.platformio, or the PIO env variable.
*/

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
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

const listReleases = async () => {
    const response = await fetch(`https://api.github.com/repos/${ REPOSITORY }/releases?per_page=100`, {
        headers: { 'User-Agent': 'spindex-build', ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${ process.env.GITHUB_TOKEN }` }) },
    });
    if (!response.ok) {
        throw new Error(`HTTP ${ response.status }`);
    }
    return firmwareReleases(await response.json());
};

// `currentDir`: this app's version comes from a bundle there, not a
// release. `local`: that bundle is the working copy's, and the releases
// are a bonus if GitHub can't be reached.
const bundleReleases = async (currentDir, local = false) => {
    let releases;
    try {
        releases = await listReleases();
    } catch (error) {
        if (!local) {
            fail(`Couldn't list the GitHub releases (${ error.message }).`);
        }
        console.warn(`Couldn't list the GitHub releases (${ error.message }), so only the working copy's firmware is bundled.`);
        releases = [];
    }
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
            ...(local ? { url: null, local: true } : { url: `https://github.com/${ REPOSITORY }/releases/tag/v${ appVersion }` }),
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

// Builds the working copy's firmware with PlatformIO into a temporary
// folder, and bundles it as this app's version with the older releases.
const bundleLocal = async () => {
    const pio = findPio();
    const built = mkdtempSync(join(tmpdir(), 'spindex-firmware-'));
    try {
        const build = spawnSync(pio, ['run', '-e', 'm5stack-stamps3', '-t', 'webbundle'], {
            cwd: controller,
            stdio: 'inherit',
            env: { ...process.env, SPINDEX_FIRMWARE_DIR: built },
        });
        if (build.status !== 0) {
            fail('Building the firmware failed.');
        }
        await bundleReleases(built, true);
    } finally {
        rmSync(built, { recursive: true, force: true });
    }
};

const currentFlag = process.argv.indexOf('--current-from');
if (process.argv.includes('--local')) {
    await bundleLocal();
} else if (currentFlag !== -1 && !process.argv[currentFlag + 1]) {
    fail('--current-from needs the folder of the bundle to include.');
} else {
    await bundleReleases(currentFlag === -1 ? undefined : process.argv[currentFlag + 1]);
}
