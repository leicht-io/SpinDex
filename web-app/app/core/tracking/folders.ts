import { Folder, Tracking } from '../storage/db';

export const UNFILED_ID = '__unfiled__';

/** "Beogram 4002 · SN 2145678", or just the name when there's no serial. */
export const folderLabel = (folder: Pick<Folder, 'name' | 'serialNumber'>): string =>
    folder.serialNumber ? `${ folder.name } · SN ${ folder.serialNumber }` : folder.name;

const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * A turntable is identified by its model name + serial number, so typing an
 * existing pair into "new measurement" should file it with the earlier
 * ones instead of creating a duplicate folder.
 */
export const findFolder = (folders: Folder[], name: string, serialNumber: string): Folder | undefined =>
    folders.find(f => normalize(f.name) === normalize(name) && normalize(f.serialNumber) === normalize(serialNumber));

export interface TrackingGroup {
    id: string;
    folder: Folder | null;
    trackings: Tracking[];
}

/**
 * Folders in their given order (empty ones included, so a freshly created
 * turntable shows up before its first measurement), then the unfiled
 * group last, only if it has anything in it. Trackings keep their input
 * order (newest first, as listTrackings returns them).
 */
export const groupTrackings = (folders: Folder[], trackings: Tracking[]): TrackingGroup[] => {
    const byFolder = new Map<string, Tracking[]>(folders.map(f => [f.id, []]));
    const unfiled: Tracking[] = [];

    for (const tracking of trackings) {
        const list = tracking.folderId ? byFolder.get(tracking.folderId) : undefined;
        // A dangling folderId (folder deleted elsewhere) falls back to unfiled.
        (list ?? unfiled).push(tracking);
    }

    const groups: TrackingGroup[] = folders.map(folder => ({
        id: folder.id,
        folder,
        trackings: byFolder.get(folder.id) ?? [],
    }));

    if (unfiled.length > 0) {
        groups.push({ id: UNFILED_ID, folder: null, trackings: unfiled });
    }

    return groups;
};
