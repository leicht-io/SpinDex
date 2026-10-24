import { describe, expect, it } from 'vitest';
import { firmwareStatus, firmwareUpdateAvailable } from './firmwareStatus';

describe('firmwareStatus', () => {
    it('tells this app’s firmware from any other version', () => {
        expect(firmwareStatus('2.4.0', true, '2.4.0')).toBe('current');
        expect(firmwareStatus('2.3.0', true, '2.4.0')).toBe('other');
        expect(firmwareStatus('2.5.0', true, '2.4.0')).toBe('other');
        expect(firmwareStatus('unversioned', true, '2.4.0')).toBe('other');
    });

    it('calls a sensor heard from without a version unreported', () => {
        expect(firmwareStatus(null, true, '2.4.0')).toBe('unreported');
        expect(firmwareStatus(null, false, '2.4.0')).toBe('unknown');
    });
});

describe('firmwareUpdateAvailable', () => {
    it('offers an update unless the firmware is current or nothing is known', () => {
        expect(firmwareUpdateAvailable('other')).toBe(true);
        expect(firmwareUpdateAvailable('unreported')).toBe(true);
        expect(firmwareUpdateAvailable('current')).toBe(false);
        expect(firmwareUpdateAvailable('unknown')).toBe(false);
    });
});
