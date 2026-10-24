import { describe, expect, it } from 'vitest';
import { parseFirmwareVersion } from './firmwareVersion';

describe('parseFirmwareVersion', () => {
    it('reads a version', () => {
        expect(parseFirmwareVersion('1.0.0')).toBe('1.0.0');
        expect(parseFirmwareVersion('1.1.0-dev+3f2a1c')).toBe('1.1.0-dev+3f2a1c');
    });

    it('tolerates surrounding whitespace and a trailing CRLF', () => {
        expect(parseFirmwareVersion(' 1.0.0\r\n')).toBe('1.0.0');
    });

    it('rejects anything that is not a version', () => {
        expect(parseFirmwareVersion('')).toBeNull();
        expect(parseFirmwareVersion('1.0 beta')).toBeNull();
        expect(parseFirmwareVersion('<b>1.0</b>')).toBeNull();
        expect(parseFirmwareVersion('-1.0.0')).toBeNull();
        expect(parseFirmwareVersion('1'.repeat(33))).toBeNull();
    });
});
