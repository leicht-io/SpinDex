export interface MockSample {
    timestamp: number;
    value: number;
}

interface MockGap {
    atFraction: number;
    durationMs: number;
}

const DEFAULT_GAPS: MockGap[] = [
    {atFraction: 0.28, durationMs: 3 * 60 * 1000},   // a short ~3 min drop
    {atFraction: 0.71, durationMs: 18 * 60 * 1000},  // a longer ~18 min drop
];

/**
 * Approximates a real 24h log: the firmware's ~520ms cadence (500ms loop
 * delay + a 20ms post-notify delay) with a little per-sample jitter, a slow
 * drift in the nominal speed (motor warm-up/wear over the run), and a
 * couple of disconnect-shaped gaps partway through — so a loaded mock
 * dataset actually exercises the same bucketing/windowing/gap-detection
 * paths a real run would, not just a smooth synthetic line.
 */
export const generateMockSamples = (
    startTime: number,
    durationMs: number,
    target: number = 33.33,
    intervalMs: number = 520,
    gaps: MockGap[] = DEFAULT_GAPS,
): MockSample[] => {
    const samples: MockSample[] = [];
    const endTime = startTime + durationMs;
    let t = startTime;
    let base = target;

    while (t < endTime) {
        const fraction = (t - startTime) / durationMs;
        const activeGap = gaps.find(g => fraction >= g.atFraction && fraction < g.atFraction + g.durationMs / durationMs);

        if (activeGap) {
            t += activeGap.durationMs;
            continue;
        }

        base += (Math.random() - 0.5) * 0.01;
        base = Math.max(target - 2, Math.min(target + 2, base));
        const jitter = (Math.random() - 0.5) * 0.25;

        samples.push({timestamp: Math.round(t), value: Number((base + jitter).toFixed(2))});
        t += intervalMs + (Math.random() * 40 - 20);
    }

    return samples;
};
