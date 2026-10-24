/*
  Turns the SpinDex firmware's USB serial output (see controller-source's
  SerialComm) into RPM readings and its firmware version. Pure, so it's
  unit-testable without a port.
*/

import { parseFirmwareVersion } from './firmwareVersion';

// The firmware always prints two decimals, so a line cut short by a full
// TX buffer can't pass for a whole one: `rpm:33.3` fails, and so do two
// lines run together where the newline was dropped (`rpm:3rpm:33.33`). Any
// debug messages sharing the port fail too.
const READING_LINE = /^rpm:(\d+\.\d{2})$/;

// Readings the device buffered while nothing was reading the port (cable
// in, page not connected) all arrive at once when it opens, up to ~20s
// old. Whatever arrives this soon after opening is dropped instead of being
// recorded as if it had just been measured -- at the firmware's 500ms
// cadence that costs a reading or two.
export const SETTLE_MS = 1_000;

// A "line" this long without a newline isn't SpinDex output (some other
// device, or noise) -- drop it rather than buffering it forever.
const MAX_LINE_LENGTH = 64;

export const parseReadingLine = (line: string): number | null => {
    const match = READING_LINE.exec(line.trim());
    return match ? Number(match[1]) : null;
};

// The firmware's answer to the `version` request the app sends on opening
// the port, also printed when the sensor starts up.
const VERSION_PREFIX = 'version:';

export const VERSION_REQUEST = 'version\n';

export const parseVersionLine = (line: string): string | null => {
    const trimmed = line.trim();
    return trimmed.startsWith(VERSION_PREFIX) ? parseFirmwareVersion(trimmed.slice(VERSION_PREFIX.length)) : null;
};

export interface SerialReadingParser {
    // Feeds the next chunk of decoded text, received at `now` (epoch ms),
    // and returns the readings it completed, oldest first.
    push: (chunk: string, now: number) => number[];
    // The version from the latest `version:` line, or null before one has
    // arrived (firmware from before it reported its version never sends
    // one).
    firmwareVersion: () => string | null;
}

export const createSerialReadingParser = (openedAt: number): SerialReadingParser => {
    // Text after the last newline: the start of a line still arriving.
    let pending = '';
    // `pending` started arriving inside the settle window, so a reading it
    // completes is just as stale as the rest of the burst.
    let pendingStale = false;
    let version: string | null = null;

    return {
        push: (chunk, now) => {
            // A version doesn't go stale, and the answer to the request sent
            // on opening arrives inside the window -- so lines are still
            // read while settling, only their readings are dropped.
            const settling = now - openedAt < SETTLE_MS;

            const lines = (pending + chunk).split('\n');
            const firstLineStale = pendingStale;
            // No newline in the chunk: it only added to the pending line.
            const continued = lines.length === 1;
            pending = lines.pop() ?? '';
            pendingStale = pending !== '' && (settling || (continued && pendingStale));
            if (pending.length > MAX_LINE_LENGTH) {
                pending = '';
                pendingStale = false;
            }

            const readings: number[] = [];
            lines.forEach((line, index) => {
                const lineVersion = parseVersionLine(line);
                if (lineVersion !== null) {
                    version = lineVersion;
                    return;
                }

                const reading = parseReadingLine(line);
                const stale = settling || (index === 0 && firstLineStale);
                if (reading !== null && !stale) {
                    readings.push(reading);
                }
            });
            return readings;
        },
        firmwareVersion: () => version,
    };
};
