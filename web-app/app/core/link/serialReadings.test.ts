import { describe, expect, it } from 'vitest';
import { createSerialReadingParser, parseReadingLine, parseVersionLine, SETTLE_MS } from './serialReadings';

describe('parseReadingLine', () => {
    it('reads a reading line', () => {
        expect(parseReadingLine('rpm:33.33')).toBe(33.33);
        expect(parseReadingLine('rpm:0.00')).toBe(0);
        expect(parseReadingLine('rpm:1250.00')).toBe(1250);
    });

    it('tolerates CRLF line endings and stray whitespace', () => {
        expect(parseReadingLine('rpm:45.01\r')).toBe(45.01);
        expect(parseReadingLine('  rpm:45.01 ')).toBe(45.01);
    });

    it('ignores the debug messages sharing the port', () => {
        expect(parseReadingLine('Starting  ITimer0, millis() = 1234')).toBeNull();
        expect(parseReadingLine('Waiting a client connection to notify...')).toBeNull();
        expect(parseReadingLine('Device Connected')).toBeNull();
        expect(parseReadingLine('')).toBeNull();
    });

    it('rejects a bare number (BLE payload format, or older firmware)', () => {
        expect(parseReadingLine('33.33')).toBeNull();
    });

    it('rejects a line cut short by a full TX buffer', () => {
        expect(parseReadingLine('rpm:33.3')).toBeNull();
        expect(parseReadingLine('rpm:33')).toBeNull();
        expect(parseReadingLine('rpm:')).toBeNull();
    });

    it('rejects two lines run together where the newline was dropped', () => {
        expect(parseReadingLine('rpm:3rpm:33.33')).toBeNull();
        expect(parseReadingLine('rpm:33.33rpm:33.34')).toBeNull();
    });
});

describe('parseVersionLine', () => {
    it('reads a version line', () => {
        expect(parseVersionLine('version:1.0.0')).toBe('1.0.0');
        expect(parseVersionLine('version:1.0.0\r')).toBe('1.0.0');
    });

    it('ignores other lines and malformed versions', () => {
        expect(parseVersionLine('rpm:33.33')).toBeNull();
        expect(parseVersionLine('version:')).toBeNull();
        expect(parseVersionLine('version:1.0 beta')).toBeNull();
        expect(parseVersionLine('firmware version:1.0.0')).toBeNull();
    });
});

describe('createSerialReadingParser', () => {
    const openedAt = 10_000;
    const settled = openedAt + SETTLE_MS;

    it('drops the burst of stale readings that arrives right after opening', () => {
        const parser = createSerialReadingParser(openedAt);

        expect(parser.push('rpm:33.10\nrpm:33.11\nrpm:33.12\n', openedAt + 5)).toEqual([]);
        expect(parser.push('rpm:33.40\n', settled)).toEqual([33.4]);
    });

    it('reassembles lines split across chunks', () => {
        const parser = createSerialReadingParser(openedAt);

        expect(parser.push('rpm:33', settled)).toEqual([]);
        expect(parser.push('.33\nrpm:4', settled + 10)).toEqual([33.33]);
        expect(parser.push('5.00\n', settled + 20)).toEqual([45]);
    });

    it('returns every reading completed by one chunk, oldest first', () => {
        const parser = createSerialReadingParser(openedAt);

        expect(parser.push('rpm:33.30\nrpm:33.31\nrpm:33.32\n', settled)).toEqual([33.3, 33.31, 33.32]);
    });

    it('drops a line whose start arrived inside the settle window', () => {
        const parser = createSerialReadingParser(openedAt);

        expect(parser.push('rpm:3', settled - 1)).toEqual([]);
        // Only the tail of that line is buffered, which isn't a valid line.
        expect(parser.push('3.33\nrpm:33.34\n', settled)).toEqual([33.34]);
    });

    it('skips debug lines between readings', () => {
        const parser = createSerialReadingParser(openedAt);

        expect(parser.push('rpm:33.33\r\nDevice Connected\r\nrpm:33.35\r\n', settled)).toEqual([33.33, 33.35]);
    });

    it('recovers after a long run of text with no newline', () => {
        const parser = createSerialReadingParser(openedAt);

        expect(parser.push('x'.repeat(200), settled)).toEqual([]);
        expect(parser.push('rpm:33.33\nrpm:33.34\n', settled + 10)).toEqual([33.33, 33.34]);
    });

    it('has no firmware version until a version line arrives', () => {
        const parser = createSerialReadingParser(openedAt);

        parser.push('rpm:33.33\n', settled);
        expect(parser.firmwareVersion()).toBeNull();
    });

    it('reads the version even inside the settle window, where readings are dropped', () => {
        const parser = createSerialReadingParser(openedAt);

        expect(parser.push('rpm:33.10\nversion:1.0.0\nrpm:33.11\n', openedAt + 5)).toEqual([]);
        expect(parser.firmwareVersion()).toBe('1.0.0');
    });

    it('reads a version line split across chunks, and keeps the latest one', () => {
        const parser = createSerialReadingParser(openedAt);

        parser.push('versi', settled);
        expect(parser.push('on:1.0.0\nrpm:33.33\n', settled + 10)).toEqual([33.33]);
        expect(parser.firmwareVersion()).toBe('1.0.0');

        // The sensor restarted with new firmware mid-session.
        parser.push('version:1.1.0\n', settled + 20);
        expect(parser.firmwareVersion()).toBe('1.1.0');
    });

    it('records the first reading after a burst that ended on a newline', () => {
        const parser = createSerialReadingParser(openedAt);

        parser.push('rpm:33.10\n', openedAt + 5);
        expect(parser.push('rpm:33.40\n', settled)).toEqual([33.4]);
    });
});
