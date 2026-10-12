const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// Same day->month ratio moment uses (400 years = 146097 days = 4800 months).
const MONTH = DAY * 146097 / 4800;
const YEAR = 12 * MONTH;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local wall-clock time as `HH:mm`, or `HH:mm:ss` when `withSeconds`. */
export const formatClock = (date: Date, withSeconds: boolean): string => {
    const hm = `${ pad(date.getHours()) }:${ pad(date.getMinutes()) }`;
    return withSeconds ? `${ hm }:${ pad(date.getSeconds()) }` : hm;
};

/**
 * Rough, human-readable length of a duration ("a few seconds", "5 minutes",
 * "an hour", ...). Mirrors moment's `duration.humanize()` with its default
 * thresholds, which this replaced, so the wording is unchanged.
 */
export const humanizeDuration = (ms: number): string => {
    const abs = Math.abs(ms);
    const seconds = Math.round(abs / SECOND);
    const minutes = Math.round(abs / MINUTE);
    const hours = Math.round(abs / HOUR);
    const days = Math.round(abs / DAY);
    const months = Math.round(abs / MONTH);
    const years = Math.round(abs / YEAR);

    if (seconds < 45) return 'a few seconds';
    if (minutes <= 1) return 'a minute';
    if (minutes < 45) return `${ minutes } minutes`;
    if (hours <= 1) return 'an hour';
    if (hours < 22) return `${ hours } hours`;
    if (days <= 1) return 'a day';
    if (days < 26) return `${ days } days`;
    if (months <= 1) return 'a month';
    if (months < 11) return `${ months } months`;
    if (years <= 1) return 'a year';
    return `${ years } years`;
};
