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
    sum: number;
    max: number;
}

export interface Sample {
    trackingId: string;
    timestamp: number;
    value: number;
}

const DB_NAME = 'spindex';
// v2: Tracking's `min` field was replaced by `sum` (Avg replaced the Min
// stat, which was ~always 0 -- RPM legitimately reports 0 whenever the
// platter is stopped/stalled). Existing rows from v1 predate `sum` entirely,
// so `tracking.sum + value` on the first write after upgrading would be
// `undefined + number` = NaN forever after -- the migration below backfills
// it by re-summing each such tracking's already-stored samples.
// v3: the v2 migration's own "already migrated?" guard used `typeof sum ===
// 'number'`, which is true for NaN too -- so a tracking that had already
// been corrupted to `sum: NaN` (by the bug v2 was fixing) looked "already
// fine" and got skipped, leaving the NaN in place. Re-run with the guard
// fixed to `Number.isFinite` instead.
const DB_VERSION = 3;
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

        request.onupgradeneeded = (event) => {
            const db = request.result;

            if (!db.objectStoreNames.contains(TRACKINGS_STORE)) {
                db.createObjectStore(TRACKINGS_STORE, {keyPath: 'id'});
            }

            if (!db.objectStoreNames.contains(SAMPLES_STORE)) {
                const samples = db.createObjectStore(SAMPLES_STORE, {keyPath: 'id', autoIncrement: true});
                samples.createIndex(BY_TRACKING_AND_TIME, ['trackingId', 'timestamp']);
            }

            if (event.oldVersion < 3) {
                backfillSumFromSamples(request.transaction!);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
};

// Runs inside the versionchange transaction itself (chaining requests keeps
// it alive), so every existing tracking is migrated atomically with the
// version bump rather than lazily/partially on next write.
const backfillSumFromSamples = (tx: IDBTransaction): void => {
    const trackingsStore = tx.objectStore(TRACKINGS_STORE);
    const byTrackingIndex = tx.objectStore(SAMPLES_STORE).index(BY_TRACKING_AND_TIME);

    trackingsStore.openCursor().onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (!cursor) {
            return;
        }

        const tracking = cursor.value as Tracking & { min?: number };
        if (Number.isFinite(tracking.sum)) {
            cursor.continue();
            return;
        }

        const range = IDBKeyRange.bound([tracking.id, -Infinity], [tracking.id, Infinity]);
        let sum = 0;
        byTrackingIndex.openCursor(range).onsuccess = (sampleEvent) => {
            const sampleCursor = (sampleEvent.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (sampleCursor) {
                const value = (sampleCursor.value as Sample).value;
                if (Number.isFinite(value)) {
                    sum += value;
                }
                sampleCursor.continue();
            } else {
                delete tracking.min;
                tracking.sum = sum;
                cursor.update(tracking);
                cursor.continue();
            }
        };
    };
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
        sum: 0,
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

export const renameTracking = async (id: string, name: string): Promise<void> => {
    const db = await openDb();
    const tx = db.transaction(TRACKINGS_STORE, 'readwrite');
    const store = tx.objectStore(TRACKINGS_STORE);
    const tracking = await promisifyRequest<Tracking | undefined>(store.get(id));

    if (tracking) {
        store.put({...tracking, name});
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
            // Number.isFinite guard, not a bare `tracking.sum + value`: if this
            // record's `sum` is still corrupt (NaN/undefined) for any reason —
            // an unmigrated row, a version-skip quirk — self-heal from here
            // rather than propagating NaN forever.
            sum: (Number.isFinite(tracking.sum) ? tracking.sum : 0) + value,
            max: Math.max(tracking.max, value),
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
