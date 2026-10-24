import * as React from 'react';
import './sidebar.scss';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import FolderIcon from '@mui/icons-material/Folder';
import InboxIcon from '@mui/icons-material/Inbox';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import SearchIcon from '@mui/icons-material/Search';
import { DRAWER_BREAKPOINT, LinkContext, TrackingContext, UIContext } from '../../context';
import { Tracking } from '../../core/storage/db';
import { folderLabel, groupTrackings, TrackingGroup } from '../../core/tracking/folders';
import { humanizeDuration } from '../../core/tracking/time';
import { Menu, useActionMenus } from '../Menu';
import { useMediaQuery } from '../../core/hooks/useMediaQuery';

// Counts read like instrument channels: 03, 12.
const pad2 = (n: number): string => String(n).padStart(2, '0');

const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const matches = (query: string, ...values: string[]): boolean =>
    values.some(v => v.toLowerCase().includes(query));

// Narrows the tree to what matches the search: a folder whose own label
// matches keeps all its measurements, otherwise only matching ones remain.
const filterGroups = (groups: TrackingGroup[], query: string): TrackingGroup[] => {
    if (!query) {
        return groups;
    }
    return groups
        .map(group => (group.folder && matches(query, folderLabel(group.folder))
            ? group
            : { ...group, trackings: group.trackings.filter(t => matches(query, t.name)) }))
        .filter(group => group.trackings.length > 0);
};

interface TrackingRowProps {
    tracking: Tracking;
}

const TrackingRow = ({ tracking }: TrackingRowProps): React.ReactElement => {
    const { connected } = React.useContext(LinkContext);
    const { viewingTracking } = React.useContext(TrackingContext);
    const { viewMode, openMeasurement, compare, maxCompare, toggleCompare } = React.useContext(UIContext);
    const { trackingItems } = useActionMenus();

    const entry = compare.find(e => e.id === tracking.id);
    const isOpen = viewMode === 'measurement' && viewingTracking?.id === tracking.id;
    const isLive = tracking.stoppedAt === null;

    return (
        <li className={ `sidebar-row ${ isOpen ? 'open' : '' }` }>
            <input
                type="checkbox"
                className={ 'sidebar-check' }
                checked={ entry !== undefined }
                disabled={ !entry && compare.length >= maxCompare }
                // The checkbox wears the measurement's comparison color, so the
                // sidebar doubles as the compare chart's legend.
                style={ entry ? { '--check-color': entry.color } as React.CSSProperties : undefined }
                onChange={ () => toggleCompare(tracking.id) }
                aria-label={ `Compare ${ tracking.name }` }
                title={ !entry && compare.length >= maxCompare ? `Up to ${ maxCompare } measurements can be compared` : 'Compare' } />
            <button className={ 'sidebar-row-main transparent' }
                onClick={ () => openMeasurement(tracking.id) }
                aria-current={ isOpen ? 'page' : undefined }>
                <span className={ 'sidebar-row-name' }>
                    {isLive && <span className={ `sidebar-live-dot ${ connected ? '' : 'disconnected' }` }
                        title={ connected ? 'Recording' : 'Recording paused — not connected' } />}
                    {tracking.name}
                </span>
                <span className={ 'sidebar-row-meta' }>
                    {formatDate(tracking.startedAt)} · {humanizeDuration((tracking.stoppedAt ?? Date.now()) - tracking.startedAt)}
                </span>
            </button>
            <Menu label={ <MoreHorizIcon fontSize={ 'small' } /> }
                ariaLabel={ `Actions for ${ tracking.name }` }
                triggerClassName={ 'circle transparent small sidebar-more' }
                align={ 'end' }
                items={ trackingItems(tracking) } />
        </li>
    );
};

export const Sidebar = (): React.ReactElement => {
    const { trackings, folders } = React.useContext(TrackingContext);
    const { sidebarOpen, setSidebarOpen, openDialog, compare, clearCompare, setViewMode } = React.useContext(UIContext);
    const { folderItems } = useActionMenus();

    const [query, setQuery] = React.useState('');
    const isDrawer = useMediaQuery(DRAWER_BREAKPOINT);
    // Docked on wide screens, so only a closed drawer is ever hidden.
    const isHidden = isDrawer && !sidebarOpen;
    const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());

    const normalizedQuery = query.trim().toLowerCase();
    const groups = filterGroups(groupTrackings(folders, trackings), normalizedQuery);

    const toggleGroup = (id: string): void => {
        setCollapsed(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <>
            <div className={ `sidebar-scrim ${ sidebarOpen ? 'visible' : '' }` }
                onClick={ () => setSidebarOpen(false) }
                aria-hidden="true" />
            <aside className={ `sidebar ${ isHidden ? '' : 'open' }` }
                // An off-screen drawer must not be reachable by Tab.
                inert={ isHidden }
                aria-label={ 'Measurement library' }>
                <div className={ 'sidebar-header' }>
                    <h2 className={ 'sidebar-title' }>
                        Library
                        <span className={ 'sidebar-title-count' }>{pad2(trackings.length)}</span>
                    </h2>
                    <button className={ 'circle transparent small' }
                        onClick={ () => openDialog({ kind: 'folder' }) }
                        aria-label={ 'New turntable folder' }
                        title={ 'New turntable folder' }>
                        <CreateNewFolderIcon fontSize={ 'small' } />
                    </button>
                </div>

                <label className={ 'sidebar-search' }>
                    <SearchIcon fontSize={ 'small' } />
                    <input className={ 'app-input' }
                        type="search"
                        placeholder={ 'Search name or serial' }
                        value={ query }
                        onChange={ (e) => setQuery(e.target.value) } />
                </label>

                <div className={ 'sidebar-tree' }>
                    {trackings.length === 0 && folders.length === 0 && (
                        <p className={ 'sidebar-empty' }>
                            No measurements yet. Create a turntable folder, then start a measurement from the menu bar.
                        </p>
                    )}
                    {groups.length === 0 && normalizedQuery && (
                        <p className={ 'sidebar-empty' }>Nothing matches &quot;{query.trim()}&quot;.</p>
                    )}

                    {groups.map(group => {
                        // Searching always expands, so hits are never hidden.
                        const isCollapsed = !normalizedQuery && collapsed.has(group.id);
                        const label = group.folder ? group.folder.name : 'Unfiled';
                        return (
                            <section key={ group.id }
                                className={ 'sidebar-group' }>
                                <div className={ 'sidebar-group-header' }>
                                    <button className={ 'sidebar-group-toggle transparent' }
                                        onClick={ () => toggleGroup(group.id) }
                                        aria-expanded={ !isCollapsed }>
                                        <ChevronRightIcon fontSize={ 'small' }
                                            className={ `sidebar-chevron ${ isCollapsed ? '' : 'expanded' }` } />
                                        {group.folder
                                            ? <FolderIcon fontSize={ 'small' }
                                                className={ 'sidebar-folder-icon' } />
                                            : <InboxIcon fontSize={ 'small' }
                                                className={ 'sidebar-folder-icon' } />}
                                        <span className={ 'sidebar-group-text' }>
                                            <span className={ 'sidebar-group-name' }>{label}</span>
                                            {group.folder?.serialNumber && (
                                                <span className={ 'sidebar-group-serial' }>SN {group.folder.serialNumber}</span>
                                            )}
                                        </span>
                                        <span className={ 'sidebar-count' }>{pad2(group.trackings.length)}</span>
                                    </button>
                                    {group.folder && (
                                        <Menu label={ <MoreHorizIcon fontSize={ 'small' } /> }
                                            ariaLabel={ `Actions for ${ folderLabel(group.folder) }` }
                                            triggerClassName={ 'circle transparent small sidebar-more' }
                                            align={ 'end' }
                                            items={ folderItems(group.folder) } />
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <ul className={ 'sidebar-list' }>
                                        {group.trackings.map(tracking => (
                                            <TrackingRow key={ tracking.id }
                                                tracking={ tracking } />
                                        ))}
                                        {group.trackings.length === 0 && group.folder && (
                                            <li className={ 'sidebar-row-empty' }>
                                                <button className={ 'transparent small' }
                                                    onClick={ () => openDialog({ kind: 'newMeasurement', folderId: group.folder?.id }) }>
                                                    + New measurement
                                                </button>
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </section>
                        );
                    })}
                </div>

                {compare.length > 0 && (
                    <div className={ 'sidebar-compare-bar' }>
                        <span>{compare.length} selected</span>
                        <button className={ 'transparent small' }
                            onClick={ clearCompare }>Clear</button>
                        <button className={ 'primary small' }
                            onClick={ () => setViewMode('compare') }>Compare</button>
                    </div>
                )}

                <footer className={ 'sidebar-footer' }>
                    Open source on <a href="https://github.com/leicht-io/SpinDex">GitHub</a>
                    {' · '}
                    Made by <a href="https://leicht.io">leicht.io</a>
                </footer>
            </aside>
        </>
    );
};
