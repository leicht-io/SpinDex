import * as React from 'react';
import { CompareEntry, DialogState, IUIContextProps, IUIProviderProps, ViewMode } from './types';
import { TrackingContext } from '../TrackingContext';

export const UIContext = React.createContext({} as IUIContextProps);

// The dataviz skill's categorical palette, dark-surface steps, in its
// fixed order (validated for overlapping lines on a dark surface). Eight
// slots is also the comparison cap -- a 9th series would need a generated
// hue.
export const COMPARE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

// Below this width the sidebar is an overlay drawer rather than a docked
// column, so it closes itself whenever the view changes underneath it.
// Above it the sidebar is always shown -- it can't be hidden.
export const DRAWER_BREAKPOINT = '(max-width: 900px)';

const isDrawerLayout = (): boolean => window.matchMedia(DRAWER_BREAKPOINT).matches;

export const UIProvider = (props: IUIProviderProps): React.ReactElement => {
    const { trackings, viewTracking } = React.useContext(TrackingContext);

    const [viewMode, setViewModeState] = React.useState<ViewMode>('measurement');
    const [selection, setSelection] = React.useState<CompareEntry[]>([]);
    const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(false);
    const [dialog, setDialog] = React.useState<DialogState | null>(null);

    // Derived rather than pruned on delete, so a deleted measurement just
    // drops out without every delete path having to remember the selection.
    const compare = selection.filter(entry => trackings.some(t => t.id === entry.id));

    // Each measurement keeps the color it was given when selected -- color
    // follows the entity, so removing one never repaints the others.
    const withColors = (ids: string[], keep: CompareEntry[]): CompareEntry[] => {
        const result = [...keep];
        for (const id of ids) {
            if (result.length >= COMPARE_COLORS.length || result.some(e => e.id === id)) {
                continue;
            }
            const color = COMPARE_COLORS.find(c => !result.some(e => e.color === c)) as string;
            result.push({ id, color });
        }
        return result;
    };

    const isCompared = (id: string): boolean => compare.some(e => e.id === id);

    const toggleCompare = (id: string): void => {
        setSelection(isCompared(id) ? compare.filter(e => e.id !== id) : withColors([id], compare));
    };

    const setViewMode = (mode: ViewMode): void => {
        setViewModeState(mode);
        if (isDrawerLayout()) {
            setSidebarOpen(false);
        }
    };

    const compareMany = (ids: string[]): void => {
        setSelection(withColors(ids, []));
        setViewMode('compare');
    };

    const openMeasurement = (id: string): void => {
        viewTracking(id);
        setViewMode('measurement');
    };

    return (
        <UIContext.Provider value={ {
            viewMode,
            setViewMode,
            openMeasurement,
            compare,
            maxCompare: COMPARE_COLORS.length,
            isCompared,
            toggleCompare,
            compareMany,
            clearCompare: () => setSelection([]),
            sidebarOpen,
            setSidebarOpen,
            dialog,
            openDialog: setDialog,
            closeDialog: () => setDialog(null),
        } }>
            {props.children}
        </UIContext.Provider>
    );
};
