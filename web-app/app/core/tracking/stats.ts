import { Sample } from '../storage/db';

export type Status = 'good' | 'warning' | 'serious' | 'critical';

// A reading's nominal target is whichever of the two BG4000-series speeds
// it's closer to.
export const nominalTarget = (value: number): number => (value > 40 ? 45 : 33.33);

// How far from a nominal speed a reading may be and still count as "at
// speed". Anything further out is the platter spinning up, slowing down
// or stopped -- transitions that would swamp a summary of how steadily it
// actually runs. The 33⅓ and 45 bands meet at ~38.3 RPM, so every reading
// is judged against the nearer speed.
export const AT_SPEED_TOLERANCE = 0.15;

export const isAtSpeed = (value: number): boolean =>
    Number.isFinite(value) && Math.abs(value - nominalTarget(value)) <= nominalTarget(value) * AT_SPEED_TOLERANCE;

// Symmetric percentage difference from the nominal target.
export const offsetPercentage = (value: number, target: number): number =>
    (Math.abs(target - value) / ((target + value) / 2)) * 100;

// Bands how far a reading sits from its nominal target. Tighter than
// typical consumer wow-and-flutter specs (~±0.5-1%) so the tiles stay
// meaningful at a glance rather than reading "good" for anything plausible.
export const statusFor = (offset: number): Status => {
    if (offset <= 0.5) {
        return 'good';
    }
    if (offset <= 1.5) {
        return 'warning';
    }
    if (offset <= 3) {
        return 'serious';
    }
    return 'critical';
};

export interface MeasurementStats {
    mean: number;
    min: number;
    max: number;
    // Population standard deviation -- a rough proxy for speed stability
    // (wow), comparable between measurements of the same turntable.
    stdDev: number;
    target: number;
    // Signed: positive = running fast, negative = running slow.
    driftPercent: number;
    // Samples that were at speed (see isAtSpeed) and went into the summary.
    atSpeedCount: number;
}

/**
 * Summary of one measurement's at-speed samples (spin-up, slow-down and
 * stopped readings excluded), or null when it never reached speed.
 */
export const computeStats = (samples: Sample[]): MeasurementStats | null => {
    let count = 0;
    let sum = 0;
    let sumSquares = 0;
    let min = Infinity;
    let max = -Infinity;

    for (const { value } of samples) {
        if (!isAtSpeed(value)) {
            continue;
        }
        count++;
        sum += value;
        sumSquares += value * value;
        min = Math.min(min, value);
        max = Math.max(max, value);
    }

    if (count === 0) {
        return null;
    }

    const mean = sum / count;
    const target = nominalTarget(mean);

    return {
        mean,
        min,
        max,
        // Clamped: floating-point cancellation can leave a tiny negative
        // variance for a perfectly constant run.
        stdDev: Math.sqrt(Math.max(0, sumSquares / count - mean * mean)),
        target,
        driftPercent: ((mean - target) / target) * 100,
        atSpeedCount: count,
    };
};

/**
 * Re-bases timestamps to "ms since the measurement started", so runs
 * recorded on different days can be overlaid on one shared x-axis.
 */
export const toElapsed = (samples: Sample[], startedAt: number): Sample[] =>
    samples.map(s => ({ ...s, timestamp: s.timestamp - startedAt }));

/** `1:05:09` / `5:09` style elapsed-time label. */
export const formatElapsed = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ss = String(seconds).padStart(2, '0');

    return hours > 0
        ? `${ hours }:${ String(minutes).padStart(2, '0') }:${ ss }`
        : `${ minutes }:${ ss }`;
};
