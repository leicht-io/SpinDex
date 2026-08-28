import {Sample, Tracking} from '../storage/db';

const sanitizeFilename = (name: string): string =>
    name.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'tracking';

export const trackingToCsv = (samples: Sample[]): string => {
    const rows = samples
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(s => `${new Date(s.timestamp).toISOString()},${s.timestamp},${s.value}`);

    return ['timestamp_iso,timestamp_ms,rpm', ...rows].join('\n');
};

export const downloadTrackingCsv = (tracking: Tracking, samples: Sample[]): void => {
    const csv = trackingToCsv(samples);
    const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFilename(tracking.name)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};
