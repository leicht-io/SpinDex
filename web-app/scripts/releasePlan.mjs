/*
  Plans a release from the conventional commits since the last one, for
  release.mjs: the next semantic version, a draft changelog entry, and
  release notes from an entry. Pure, so it's unit-testable without git.

  feat -> minor, fix/perf -> patch, `type!:` or a BREAKING CHANGE footer ->
  major. Other types (docs, chore, ci, test, refactor, ...) don't release.
*/

// type(scope)!: description
const HEADER = /^(\w+)(?:\(([^)]*)\))?(!)?: (.+)$/;
const BREAKING_FOOTER = /^BREAKING[ -]CHANGE:/m;
const RELEASE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

// A commit message's conventional-commit parts, or null if it isn't one
// (merge commits, free-form messages).
export const parseCommit = (message) => {
    const [subject, ...rest] = message.trim().split('\n');
    const match = HEADER.exec(subject.trim());
    if (!match) {
        return null;
    }
    const [, type, scope, bang, description] = match;
    return { type: type.toLowerCase(), scope: scope ?? null, breaking: bang === '!' || BREAKING_FOOTER.test(rest.join('\n')), description };
};

export const bumpFor = (commits) => {
    if (commits.some(commit => commit.breaking)) {
        return 'major';
    }
    if (commits.some(commit => commit.type === 'feat')) {
        return 'minor';
    }
    if (commits.some(commit => commit.type === 'fix' || commit.type === 'perf')) {
        return 'patch';
    }
    return null;
};

export const nextVersion = (version, bump) => {
    const match = RELEASE_VERSION.exec(version);
    if (!match) {
        throw new Error(`${ version } isn't a plain major.minor.patch version`);
    }
    const [major, minor, patch] = match.slice(1).map(Number);
    return {
        major: `${ major + 1 }.0.0`,
        minor: `${ major }.${ minor + 1 }.0`,
        patch: `${ major }.${ minor }.${ patch + 1 }`,
    }[bump];
};

// A commit description as a changelog line: capitalised, a full stop, and
// without the "(v2.2.0)" some commit subjects end with.
const bullet = (description) => {
    const text = description.replace(/\s*\(v\d+\.\d+\.\d+\)$/, '').trim();
    const sentence = text.charAt(0).toUpperCase() + text.slice(1);
    return /[.!?]$/.test(sentence) ? sentence : `${ sentence }.`;
};

/**
 * A draft changelog entry (core/changelog's ChangelogEntry) from the
 * commits: features under added, fixes under fixed, performance work and
 * breaking changes under changed. The wording is the commits', to be
 * edited into user-facing prose in the release PR.
 */
export const changelogEntry = (version, date, commits) => {
    const lines = predicate => [...new Set(commits.filter(predicate).map(commit => bullet(commit.description)))];
    const entry = { version, date, title: '' };
    const added = lines(commit => commit.type === 'feat' && !commit.breaking);
    const changed = lines(commit => commit.breaking || commit.type === 'perf');
    const fixed = lines(commit => commit.type === 'fix' && !commit.breaking);
    entry.title = (changed[0] ?? added[0] ?? fixed[0] ?? `Release ${ version }`).replace(/\.$/, '');
    if (added.length > 0) {
        entry.added = added;
    }
    if (changed.length > 0) {
        entry.changed = changed;
    }
    if (fixed.length > 0) {
        entry.fixed = fixed;
    }
    return entry;
};

const quote = text => `'${ text.replace(/\\/g, '\\\\').replace(/'/g, '\\\'') }'`;

// changelog.ts with `entry` added as the newest release, in its style.
export const insertChangelogEntry = (source, entry) => {
    const anchor = 'export const CHANGELOG: ChangelogEntry[] = [\n';
    const at = source.indexOf(anchor);
    if (at === -1) {
        throw new Error('changelog.ts has no CHANGELOG array to add to');
    }
    const field = (name, value) => `        ${ name }: ${ quote(value) },\n`;
    const list = (name, items) => (items
        ? `        ${ name }: [\n${ items.map(item => `            ${ quote(item) },\n`).join('') }        ],\n`
        : '');
    const text = '    {\n'
        + field('version', entry.version)
        + field('date', entry.date)
        + field('title', entry.title)
        + list('added', entry.added)
        + list('changed', entry.changed)
        + list('fixed', entry.fixed)
        + '    },\n';
    const end = at + anchor.length;
    return source.slice(0, end) + text + source.slice(end);
};

// GitHub release notes from a changelog entry, with the app's section names.
export const releaseNotes = (entry) => {
    const section = (label, items) => (items?.length ? `### ${ label }\n\n${ items.map(item => `- ${ item }`).join('\n') }\n\n` : '');
    return `## ${ entry.title }\n\n`
        + section('New', entry.added)
        + section('Changed', entry.changed)
        + section('Fixed', entry.fixed)
        + 'Flash this firmware from the SpinDex app (connection menu → Update sensor firmware…), '
        + 'or upload `spindex-web-' + entry.version + '.zip`\'s contents to deploy the app.\n';
};
