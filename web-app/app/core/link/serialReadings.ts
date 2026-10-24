/*
  Turns the SpinDex firmware's USB serial output (see controller-source's
  SerialComm) into RPM readings. Pure, so it's unit-testable without a port.
*/

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

export interface SerialReadingParser {
    // Feeds the next chunk of decoded text, received at `now` (epoch ms),
    // and returns the readings it completed, oldest first.
    push: (chunk: string, now: number) => number[];
}

export const createSerialReadingParser = (openedAt: number): SerialReadingParser => {
    // Text after the last newline: the start of a line still arriving.
    let pending = '';

    return {
        push: (chunk, now) => {
            if (now - openedAt < SETTLE_MS) {
                return [];
            }

            const lines = (pending + chunk).split('\n');
            pending = lines.pop() ?? '';
            if (pending.length > MAX_LINE_LENGTH) {
                pending = '';
            }

            const readings: number[] = [];
            for (const line of lines) {
                const reading = parseReadingLine(line);
                if (reading !== null) {
                    readings.push(reading);
                }
            }
            return readings;
        },
    };
};
