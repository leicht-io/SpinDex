/*
  The sensor's firmware version, as it reports it on connecting: over
  Bluetooth in the Device Information Service, over USB as a `version:` line
  (see controller-source's Version.h).
*/

// What controller-source's Version.h allows: a semver-like tag such as
// `1.0.0` or `1.1.0-dev+3f2a1c`.
const FIRMWARE_VERSION = /^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$/;

// The version in `text`, or null if it isn't one -- not SpinDex firmware,
// or a garbled read.
export const parseFirmwareVersion = (text: string): string | null => {
    const trimmed = text.trim();
    return FIRMWARE_VERSION.test(trimmed) ? trimmed : null;
};
