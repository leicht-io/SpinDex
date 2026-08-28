/*
  Minimal IndexedDB wrapper for tracking sessions.

  A "tracking" is one recording session (Start Tracking .. Stop Tracking).
  Its samples are stored individually so a 24h session (~150-200k rows)
  never has to live in a single JS array or get copied on every append —
  see resample.ts for how the chart reads a bounded view back out of this.

  No third-party IndexedDB wrapper (idb, dexie, ...) is used here to avoid
  adding a dependency for what's a small, fixed set of queries.
*/

export interface Tracking {
    id: string;
    name: string;
    startedAt: number;
    stoppedAt: number | null;
    sampleCount: number;
    min: number;
    max: number;
}

export interface Sample {
    trackingId: string;
    timestamp: number;
    value: number;
}

const DB_NAME = 'spindex';
const DB_VERSION = 1;
const TRACKINGS_STORE = 'trackings';
const SAMPLES_STORE = 'samples';
const BY_TRACKING_AND_TIME = 'byTrackingAndTime';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(TRACKINGS_STORE)) {
                db.createObjectStore(TRACKINGS_STORE, {keyPath: 'id'});
            }

            if (!db.objectStoreNames.contains(SAMPLES_STORE)) {
                const samples = db.createObjectStore(SAMPLES_STORE, {keyPath: 'id', autoIncrement: true});
                samples.createIndex(BY_TRACKING_AND_TIME, ['trackingId', 'timestamp']);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
};

const promisifyRequest = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
});

const promisifyTx = (tx: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
});

const generateId = (): string =>
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// startedAt/stoppedAt are overridable so mock/backdated datasets (see
// core/tracking/mock.ts) can declare a tracking's bounds up front instead
// of always meaning "starting now".
export const createTracking = async (
    name?: string,
    startedAt: number = Date.now(),
    stoppedAt: number | null = null,
): Promise<Tracking> => {
    const db = await openDb();
    const tracking: Tracking = {
        id: generateId(),
        name: name ?? `Tracking — ${new Date().toLocaleString()}`,
        startedAt,
        stoppedAt,
        sampleCount: 0,
        min: Infinity,
        max: -Infinity,
    };

    const tx = db.transaction(TRACKINGS_STORE, 'readwrite');
    tx.objectStore(TRACKINGS_STORE).put(tracking);
    await promisifyTx(tx);

    return tracking;
};

export const stopTracking = async (id: string): Promise<void> => {
    const db = await openDb();
    const tx = db.transaction(TRACKINGS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKINGS_STORE);
    const tracking = await promisifyRequest<Tracking | undefined>(store.get(id));

    if (tracking) {
        store.put({...tracking, stoppedAt: Date.now()});
    }

    await promisifyTx(tx);
};

export const deleteTracking = async (id: string): Promise<void> => {
    const db = await openDb();
    const tx = db.transaction([TRACKINGS_STORE, SAMPLES_STORE], 'readwrite');
    tx.objectStore(TRACKINGS_STORE).delete(id);

    const samples = tx.objectStore(SAMPLES_STORE);
    const index = samples.index(BY_TRACKING_AND_TIME);
    const range = IDBKeyRange.bound([id, -Infinity], [id, Infinity]);
    const cursorRequest = index.openCursor(range);

    cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
            cursor.delete();
            cursor.continue();
        }
    };

    await promisifyTx(tx);
};

// Fire-and-forget from the BLE hot path: persists the sample and keeps the
// tracking's running min/max/sampleCount current, without ever reading back
// the full sample list.
export const addSample = async (trackingId: string, timestamp: number, value: number): Promise<void> => {
    const db = await openDb();
    const tx = db.transaction([TRACKINGS_STORE, SAMPLES_STORE], 'readwrite');

    tx.objectStore(SAMPLES_STORE).add({trackingId, timestamp, value} as Sample);

    const trackingStore = tx.objectStore(TRACKINGS_STORE);
    const tracking = await promisifyRequest<Tracking | undefined>(trackingStore.get(trackingId));

    if (tracking) {
        trackingStore.put({
            ...tracking,
            sampleCount: tracking.sampleCount + 1,
            min: Math.min(tracking.min, value),
            max: Math.max(tracking.max, value),
        });
    }

    await promisifyTx(tx);
};

// Bulk variant for backfilling a large dataset in one shot (e.g. the mock
// 24h dataset in dev tools) — one transaction and one min/max/count update
// for the whole batch, instead of one transaction per sample. addSample()'s
// per-sample transaction is fine at BLE's ~2/sec hot-path rate, but doing
// that ~166k times in a loop for a bulk load would be needlessly slow.
export const bulkAddSamples = async (trackingId: string, samples: Array<{ timestamp: number; value: number }>): Promise<void> => {
    if (samples.length === 0) {
        return;
    }

    const db = await openDb();
    const tx = db.transaction([TRACKINGS_STORE, SAMPLES_STORE], 'readwrite');
    const samplesStore = tx.objectStore(SAMPLES_STORE);

    let min = Infinity;
    let max = -Infinity;
    for (const {timestamp, value} of samples) {
        samplesStore.add({trackingId, timestamp, value} as Sample);
        min = Math.min(min, value);
        max = Math.max(max, value);
    }

    const trackingStore = tx.objectStore(TRACKINGS_STORE);
    const tracking = await promisifyRequest<Tracking | undefined>(trackingStore.get(trackingId));

    if (tracking) {
        trackingStore.put({
            ...tracking,
            sampleCount: tracking.sampleCount + samples.length,
            min: Math.min(tracking.min, min),
            max: Math.max(tracking.max, max),
        });
    }

    await promisifyTx(tx);
};

export const listTrackings = async (): Promise<Tracking[]> => {
    const db = await openDb();
    const tx = db.transaction(TRACKINGS_STORE, 'readonly');
    const all = await promisifyRequest<Tracking[]>(tx.objectStore(TRACKINGS_STORE).getAll());
    return all.sort((a, b) => b.startedAt - a.startedAt);
};

export const getActiveTracking = async (): Promise<Tracking | null> => {
    const trackings = await listTrackings();
    return trackings.find(t => t.stoppedAt === null) ?? null;
};

export const getSamplesInRange = async (trackingId: string, start: number, end: number): Promise<Sample[]> => {
    const db = await openDb();
    const tx = db.transaction(SAMPLES_STORE, 'readonly');
    const index = tx.objectStore(SAMPLES_STORE).index(BY_TRACKING_AND_TIME);
    const range = IDBKeyRange.bound([trackingId, start], [trackingId, end]);
    return promisifyRequest<Sample[]>(index.getAll(range));
};

export const getAllSamples = (trackingId: string): Promise<Sample[]> =>
    getSamplesInRange(trackingId, -Infinity, Infinity);
