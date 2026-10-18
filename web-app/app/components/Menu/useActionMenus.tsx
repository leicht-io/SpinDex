import * as React from 'react';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import EditIcon from '@mui/icons-material/Edit';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import StopIcon from '@mui/icons-material/Stop';
import { TrackingContext, UIContext } from '../../context';
import { Folder, Tracking } from '../../core/storage/db';
import { MenuEntry } from './Menu';

/**
 * The same measurement/folder actions are offered from the menu bar, the
 * sidebar's row menus and the measurement header -- built in one place so
 * they can't drift apart.
 */
export const useActionMenus = () => {
    const { trackings, activeTracking, stopTracking, exportTracking } = React.useContext(TrackingContext);
    const { openDialog, isCompared, toggleCompare, compare, maxCompare, compareMany } = React.useContext(UIContext);

    const trackingItems = (tracking: Tracking | null): MenuEntry[] => {
        const compared = tracking !== null && isCompared(tracking.id);
        return [
            ...(tracking && tracking.id === activeTracking?.id ? [{
                label: 'Stop recording',
                icon: <StopIcon fontSize={ 'small' } />,
                onSelect: () => stopTracking(),
            }, 'divider' as const] : []),
            {
                label: compared ? 'Remove from comparison' : 'Add to comparison',
                icon: <CompareArrowsIcon fontSize={ 'small' } />,
                disabled: !tracking || (!compared && compare.length >= maxCompare),
                onSelect: () => tracking && toggleCompare(tracking.id),
            },
            'divider',
            {
                label: 'Rename…',
                icon: <EditIcon fontSize={ 'small' } />,
                disabled: !tracking,
                onSelect: () => tracking && openDialog({ kind: 'rename', tracking }),
            },
            {
                label: 'Move to folder…',
                icon: <DriveFileMoveIcon fontSize={ 'small' } />,
                disabled: !tracking,
                onSelect: () => tracking && openDialog({ kind: 'move', tracking }),
            },
            {
                label: 'Export as CSV',
                icon: <DownloadIcon fontSize={ 'small' } />,
                disabled: !tracking,
                onSelect: () => tracking && exportTracking(tracking.id),
            },
            'divider',
            {
                label: 'Delete…',
                icon: <DeleteIcon fontSize={ 'small' } />,
                disabled: !tracking,
                danger: true,
                onSelect: () => tracking && openDialog({ kind: 'deleteTracking', tracking }),
            },
        ];
    };

    const folderItems = (folder: Folder): MenuEntry[] => {
        const ids = trackings.filter(t => t.folderId === folder.id).map(t => t.id);
        return [
            {
                label: 'New measurement here…',
                icon: <FiberManualRecordIcon fontSize={ 'small' } />,
                onSelect: () => openDialog({ kind: 'newMeasurement', folderId: folder.id }),
            },
            {
                label: ids.length > maxCompare ? `Compare latest ${ maxCompare }` : 'Compare all',
                icon: <CompareArrowsIcon fontSize={ 'small' } />,
                disabled: ids.length < 2,
                onSelect: () => compareMany(ids),
            },
            'divider',
            {
                label: 'Edit turntable…',
                icon: <EditIcon fontSize={ 'small' } />,
                onSelect: () => openDialog({ kind: 'folder', folder }),
            },
            {
                label: 'Delete folder…',
                icon: <DeleteIcon fontSize={ 'small' } />,
                danger: true,
                onSelect: () => openDialog({ kind: 'deleteFolder', folder }),
            },
        ];
    };

    const newItems: MenuEntry[] = [
        {
            label: 'New measurement…',
            icon: <FiberManualRecordIcon fontSize={ 'small' } />,
            onSelect: () => openDialog({ kind: 'newMeasurement' }),
        },
        {
            label: 'New turntable folder…',
            icon: <CreateNewFolderIcon fontSize={ 'small' } />,
            onSelect: () => openDialog({ kind: 'folder' }),
        },
    ];

    return { trackingItems, folderItems, newItems };
};
