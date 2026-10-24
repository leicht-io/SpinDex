/*
  Release steps for the Release workflow (.github/workflows/release.yml);
  each prints `key=value` lines for $GITHUB_OUTPUT.

    status    version=<package.json's>, released=<whether tag v<version> exists>
    prepare   Bumps package.json and drafts a changelog.ts entry from the
              conventional commits since tag v<version> (see releasePlan).
              next=<the new version>, or nothing if no commit releases.
              Writes the release PR's description to the file given.
    notes     The GitHub release notes for package.json's version, from its
              changelog entry, to the file given.

  Run with Node 24 or newer: it imports changelog.ts directly.
*/

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bumpFor, changelogEntry, insertChangelogEntry, nextVersion, parseCommit, releaseNotes } from './releasePlan.mjs';

const webApp = join(dirname(fileURLToPath(import.meta.url)), '..');
const packagePath = join(webApp, 'package.json');
const changelogPath = join(webApp, 'app', 'core', 'changelog.ts');

const git = (...args) => execFileSync('git', args, { cwd: webApp, encoding: 'utf8' });
const version = () => JSON.parse(readFileSync(packagePath, 'utf8')).version;
const tagExists = tag => {
    try {
        git('rev-parse', '--quiet', '--verify', `refs/tags/${ tag }`);
        return true;
    } catch {
        return false;
    }
};
const output = values => Object.entries(values).forEach(([key, value]) => console.log(`${ key }=${ value }`));

const status = () => {
    output({ version: version(), released: tagExists(`v${ version() }`) });
};

const prepare = (bodyFile) => {
    const current = version();
    const tag = `v${ current }`;
    if (!tagExists(tag)) {
        throw new Error(`${ tag } isn't tagged yet: publish it before preparing the next release.`);
    }

    // Every commit since, branch commits included (merges themselves aren't
    // conventional commits), each ending in a NUL.
    const messages = git('log', '--no-merges', '--format=%B%x00', `${ tag }..HEAD`).split('\0').map(message => message.trim()).filter(Boolean);
    const commits = messages.map(parseCommit).filter(Boolean);
    const bump = bumpFor(commits);
    if (!bump) {
        output({ next: '' });
        return;
    }

    const next = nextVersion(current, bump);
    const entry = changelogEntry(next, new Date().toISOString().slice(0, 10), commits);
    const pkg = readFileSync(packagePath, 'utf8');
    writeFileSync(packagePath, pkg.replace(`"version": "${ current }"`, `"version": "${ next }"`));
    writeFileSync(changelogPath, insertChangelogEntry(readFileSync(changelogPath, 'utf8'), entry));

    const subjects = messages.map(message => `- ${ message.split('\n')[0] }`).join('\n');
    writeFileSync(bodyFile, `Releases **${ next }** (a ${ bump } bump from ${ current }).\n\n`
        + `Before merging, edit the new entry in \`web-app/app/core/changelog.ts\`: the title and lines are the commit `
        + `subjects, and the app shows them to users as release notes. Merging publishes the release: the \`v${ next }\` `
        + `tag, firmware and the web app build on GitHub.\n\n`
        + `<details><summary>Commits since ${ tag }</summary>\n\n${ subjects }\n\n</details>\n`);
    output({ next });
};

const notes = async (notesFile) => {
    const { CHANGELOG } = await import(changelogPath);
    const entry = CHANGELOG.find(candidate => candidate.version === version());
    if (!entry) {
        throw new Error(`changelog.ts has no entry for ${ version() }.`);
    }
    writeFileSync(notesFile, releaseNotes(entry));
};

const [command, file] = process.argv.slice(2);
const commands = { status, prepare, notes };
if (!Object.hasOwn(commands, command ?? '') || (command !== 'status' && !file)) {
    console.error('Usage: release.mjs status | prepare <pr-body-file> | notes <notes-file>');
    process.exit(2);
}
await commands[command](file);
