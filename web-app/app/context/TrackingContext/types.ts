import {Tracking} from '../../core/storage/db';
import {Bucket, Gap} from '../../core/tracking/resample';

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

    startTracking: (name?: string) => Promise<void>;
    stopTracking: () => Promise<void>;
    deleteTracking: (id: string) => Promise<void>;
    renameTracking: (id: string, name: string) => Promise<void>;
    exportTracking: (id: string) => Promise<void>;
    viewTracking: (id: string) => void;

    recordSample: (value: number) => void;
}
