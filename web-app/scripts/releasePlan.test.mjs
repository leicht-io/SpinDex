import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bumpFor, changelogEntry, insertChangelogEntry, nextVersion, parseCommit, releaseNotes } from './releasePlan.mjs';

const commits = (...messages) => messages.map(parseCommit).filter(Boolean);

describe('parseCommit', () => {
    it('reads a conventional commit', () => {
        expect(parseCommit('feat(web-app): connect over USB (v2.2.0)\n\nBody.')).toEqual({
            type: 'feat', scope: 'web-app', breaking: false, description: 'connect over USB (v2.2.0)',
        });
        expect(parseCommit('fix: record samples')).toMatchObject({ type: 'fix', scope: null });
    });

    it('spots breaking changes, by ! or footer', () => {
        expect(parseCommit('feat(controller)!: new BLE protocol').breaking).toBe(true);
        expect(parseCommit('feat: x\n\nBREAKING CHANGE: the app needs firmware 3').breaking).toBe(true);
    });

    it('ignores merges and free-form messages', () => {
        expect(parseCommit('Merge pull request #14 from leicht-io/feat/usb-support')).toBeNull();
        expect(parseCommit('Updated docs.')).toBeNull();
    });
});

describe('bumpFor and nextVersion', () => {
    it('follows semver from the commit types', () => {
        expect(bumpFor(commits('docs: x', 'fix: y'))).toBe('patch');
        expect(bumpFor(commits('perf: x'))).toBe('patch');
        expect(bumpFor(commits('fix: y', 'feat: z'))).toBe('minor');
        expect(bumpFor(commits('feat: z', 'fix!: w'))).toBe('major');
        expect(bumpFor(commits('docs: x', 'chore: y', 'Merge branch'))).toBeNull();
    });

    it('bumps a plain version', () => {
        expect(nextVersion('2.4.0', 'patch')).toBe('2.4.1');
        expect(nextVersion('2.4.1', 'minor')).toBe('2.5.0');
        expect(nextVersion('2.5.3', 'major')).toBe('3.0.0');
        expect(() => nextVersion('2.5.0-rc1', 'patch')).toThrow();
    });
});

describe('changelogEntry', () => {
    it('drafts sections from the commits', () => {
        expect(changelogEntry('2.5.0', '2026-11-02', commits(
            'feat(web-app): show battery level (v2.5.0)',
            'fix(controller): keep advertising after a disconnect',
            'perf: faster chart',
            'feat: show battery level',
            'docs: readme',
        ))).toEqual({
            version: '2.5.0',
            date: '2026-11-02',
            title: 'Faster chart',
            added: ['Show battery level.'],
            changed: ['Faster chart.'],
            fixed: ['Keep advertising after a disconnect.'],
        });
    });
});

describe('insertChangelogEntry', () => {
    it('adds the entry first, in a form changelog.ts still parses', async () => {
        // Vitest runs from web-app/ (jsdom gives import.meta.url no file: scheme).
        const source = readFileSync(join(process.cwd(), 'app/core/changelog.ts'), 'utf8');
        const entry = { version: '9.9.9', date: '2099-01-01', title: 'It\'s new', added: ['A \\ backslash.'] };
        const updated = insertChangelogEntry(source, entry);

        expect(updated.indexOf('9.9.9')).toBeLessThan(updated.indexOf('2.4.0'));
        // Inside the project: Vite won't import from outside it.
        const cache = join(process.cwd(), 'node_modules', '.cache');
        mkdirSync(cache, { recursive: true });
        const dir = mkdtempSync(join(cache, 'changelog-'));
        try {
            writeFileSync(join(dir, 'changelog.ts'), updated);
            const module = await import(join(dir, 'changelog.ts'));
            expect(module.CHANGELOG[0]).toEqual(entry);
            expect(module.APP_VERSION).toBe('9.9.9');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

describe('releaseNotes', () => {
    it('renders the entry as markdown', () => {
        const notes = releaseNotes({ version: '2.5.0', title: 'Battery', added: ['Show battery level.'], fixed: ['Keep advertising.'] });

        expect(notes).toContain('## Battery');
        expect(notes).toContain('### New\n\n- Show battery level.');
        expect(notes).toContain('### Fixed\n\n- Keep advertising.');
        expect(notes).not.toContain('### Changed');
        expect(notes).toContain('spindex-web-2.5.0.zip');
    });
});
