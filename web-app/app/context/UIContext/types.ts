import { Folder, Tracking } from '../../core/storage/db';

export type ViewMode = 'measurement' | 'compare';

export type DialogState =
    | { kind: 'newMeasurement'; folderId?: string | null }
    | { kind: 'folder'; folder?: Folder }
    | { kind: 'rename'; tracking: Tracking }
    | { kind: 'move'; tracking: Tracking }
    | { kind: 'deleteTracking'; tracking: Tracking }
    | { kind: 'deleteFolder'; folder: Folder };

export interface CompareEntry {
    id: string;
    color: string;
}

export interface IUIProviderProps {
    children: any;
}

export interface IUIContextProps {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    // Opens a measurement in the single-measurement view.
    openMeasurement: (id: string) => void;

    compare: CompareEntry[];
    maxCompare: number;
    isCompared: (id: string) => boolean;
    toggleCompare: (id: string) => void;
    // Replaces the selection (capped at maxCompare) and switches to compare.
    compareMany: (ids: string[]) => void;
    clearCompare: () => void;

    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;

    dialog: DialogState | null;
    openDialog: (dialog: DialogState) => void;
    closeDialog: () => void;
}
