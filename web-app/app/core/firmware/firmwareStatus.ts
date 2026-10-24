/*
  What the sensor's reported firmware means next to this app. The firmware
  takes the app's version (controller-source's firmware_version.py), so
  any other version -- older, newer, or a dev build's "unversioned" -- isn't
  the firmware for this app.
*/

// current: it runs this app's firmware. other: it reports another version.
// unreported: it's been heard from but sent no version, so its firmware is
// from before SpinDex 2.3.0. unknown: not heard from (yet).
export type FirmwareStatus = 'current' | 'other' | 'unreported' | 'unknown';

// `heard`: readings arrive, or the sensor is attached over USB but silent
// there (firmware from before USB support).
export const firmwareStatus = (reported: string | null, heard: boolean, appVersion: string): FirmwareStatus => {
    if (reported !== null) {
        return reported === appVersion ? 'current' : 'other';
    }
    return heard ? 'unreported' : 'unknown';
};

// An update would change something: worth offering.
export const firmwareUpdateAvailable = (status: FirmwareStatus): boolean => status === 'other' || status === 'unreported';
