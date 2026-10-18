import { Folder, Tracking } from '../../core/storage/db';
import { Bucket, Gap } from '../../core/tracking/resample';

export interface WindowOption {
    id: string;
    label: string;
    ms: number | null; // null = "All" (the whole tracking)
}

export interface ITrackingProviderProps {
    children: any;
}

export interface ITrackingContextProps {
    trackings: Tracking[];
    folders: Folder[];
    activeTracking: Tracking | null;
    viewingTracking: Tracking | null;
    latestValue: number;

    windowOptions: WindowOption[];
    selectedWindow: WindowOption;
    setSelectedWindow: (option: WindowOption) => void;

    chartBuckets: Bucket[];
    chartGaps: Gap[];
    chartRangeStart: number;
    chartRangeEnd: number;
    isLoadingChart: boolean;

    startTracking: (name?: string, folderId?: string | null) => Promise<void>;
    stopTracking: () => Promise<void>;
    deleteTracking: (id: string) => Promise<void>;
    renameTracking: (id: string, name: string) => Promise<void>;
    exportTracking: (id: string) => Promise<void>;
    viewTracking: (id: string) => void;
    moveTracking: (id: string, folderId: string | null) => Promise<void>;

    createFolder: (name: string, serialNumber: string) => Promise<Folder>;
    updateFolder: (id: string, name: string, serialNumber: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;

    recordSample: (value: number) => void;
}
