import { describe, expect, it } from 'vitest';
import { Folder, Tracking } from '../storage/db';
import { findFolder, folderLabel, groupTrackings, UNFILED_ID } from './folders';

const folder = (id: string, name: string, serialNumber: string): Folder => ({ id, name, serialNumber, createdAt: 0 });

const tracking = (id: string, folderId?: string | null): Tracking => ({
    id,
    name: id,
    folderId,
    startedAt: 0,
    stoppedAt: 0,
    sampleCount: 0,
    sum: 0,
    max: 0,
});

describe('folderLabel', () => {
    it('includes the serial number only when there is one', () => {
        expect(folderLabel({ name: 'Beogram 4002', serialNumber: '123' })).toBe('Beogram 4002 · SN 123');
        expect(folderLabel({ name: 'Beogram 4002', serialNumber: '' })).toBe('Beogram 4002');
    });
});

describe('findFolder', () => {
    const folders = [folder('a', 'Beogram 4002', '123'), folder('b', 'Beogram 4002', '456')];

    it('matches on name and serial, ignoring case and surrounding space', () => {
        expect(findFolder(folders, ' beogram 4002 ', '456')?.id).toBe('b');
    });

    it('does not match the same model with another serial', () => {
        expect(findFolder(folders, 'Beogram 4002', '789')).toBeUndefined();
    });
});

describe('groupTrackings', () => {
    it('groups by folder, keeps empty folders and puts unfiled last', () => {
        const folders = [folder('a', 'A', ''), folder('b', 'B', '')];
        const groups = groupTrackings(folders, [tracking('t1', 'a'), tracking('t2'), tracking('t3', 'a')]);

        expect(groups.map(g => g.id)).toEqual(['a', 'b', UNFILED_ID]);
        expect(groups[0].trackings.map(t => t.id)).toEqual(['t1', 't3']);
        expect(groups[1].trackings).toEqual([]);
        expect(groups[2].trackings.map(t => t.id)).toEqual(['t2']);
    });

    it('treats a dangling folderId as unfiled and omits an empty unfiled group', () => {
        expect(groupTrackings([], [tracking('t1', 'gone')])[0].id).toBe(UNFILED_ID);
        expect(groupTrackings([folder('a', 'A', '')], [])).toHaveLength(1);
    });
});
