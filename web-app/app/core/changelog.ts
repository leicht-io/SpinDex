/*
  User-facing release notes, newest first. The first entry's version is the
  app version shown in the status bar -- changelog.test.ts keeps it equal to
  package.json's, so bump both together.
*/

export interface ChangelogEntry {
    version: string;
    // ISO date (YYYY-MM-DD).
    date: string;
    title: string;
    added?: string[];
    changed?: string[];
    fixed?: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '2.1.0',
        date: '2026-10-18',
        title: 'A proper app: library, comparison and a new look',
        added: [
            'Menu bar with File, Measurement and View menus, and a status bar with link state, live recording readout and clock.',
            'Library of turntable folders, identified by model and serial number, with search.',
            'Compare up to eight measurements overlaid by time since start, with a hover readout and a stats table (mean, drift, standard deviation, min, max).',
            'New measurement dialog: pick or create the turntable it was measured on.',
            'Help for browsers without Web Bluetooth: supported browsers and how to continue on each platform.',
            'Changelog (you are reading it).',
        ],
        changed: [
            'New design after leicht.io: IBM Plex Sans and Mono, warm dark surfaces, copper accent.',
            'New SpinDex mark: a strobe disc read against a fixed index. The platter turns while recording.',
            'Readouts show deviation from 33⅓ / 45 RPM on a gauge, and the chart marks the nominal speed.',
            'The chart now zooms to the measured range instead of always starting at 0.',
            'Summary stats ignore spin-up and stopped readings.',
        ],
        fixed: [
            'Dialogs now dim the page behind them.',
        ],
    },
    {
        version: '2.0.0',
        date: '2026-10-12',
        title: 'Persistent sessions and a precision-instrument theme',
        added: [
            'Recordings are saved in the browser and resume after a page reload.',
            'Export any recording as CSV.',
            'Name and rename recordings.',
            'Gaps in the data (disconnects, app closed) are shown on the chart.',
            'SpinDex notices when Bluetooth is turned off.',
        ],
        changed: [
            'Single dark theme designed as a precision instrument.',
            'Faster first load and better search-engine metadata.',
        ],
        fixed: [
            'Samples are recorded for recordings started after pairing.',
            'Web Bluetooth calls now follow the specification.',
        ],
    },
];

export const APP_VERSION = CHANGELOG[0].version;
