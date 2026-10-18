import * as React from 'react';
import './menubar.scss';
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StopIcon from '@mui/icons-material/Stop';
import { BLEContext, TrackingContext, UIContext } from '../../context';
import { Menu, MenuEntry, useActionMenus } from '../Menu';

export const MenuBar = (): React.ReactElement => {
    const { initBluetooth, status, connected, available } = React.useContext(BLEContext);
    const {
        activeTracking,
        viewingTracking,
        stopTracking,
        exportTracking,
        windowOptions,
        selectedWindow,
        setSelectedWindow,
    } = React.useContext(TrackingContext);
    const { viewMode, setViewMode, compare, sidebarOpen, setSidebarOpen, openDialog } = React.useContext(UIContext);
    const { trackingItems, newItems } = useActionMenus();

    // The BLE status is a loose set of human-readable sentences (see
    // BLEContext), not an enum, so this is a best-effort read of "an attempt
    // is in flight" purely to drive the button's pulse animation.
    const isSearching = !connected && available !== false && status !== ''
        && !status.startsWith('Error') && !status.includes('not available');

    const viewItems: MenuEntry[] = [
        {
            label: 'Measurement',
            checked: viewMode === 'measurement',
            disabled: !viewingTracking,
            onSelect: () => setViewMode('measurement'),
        },
        {
            label: 'Compare',
            hint: compare.length > 0 ? String(compare.length) : undefined,
            checked: viewMode === 'compare',
            onSelect: () => setViewMode('compare'),
        },
        { heading: 'Time window' },
        ...windowOptions.map(option => ({
            label: option.label,
            checked: option.id === selectedWindow.id,
            disabled: viewMode !== 'measurement' || !viewingTracking,
            onSelect: () => setSelectedWindow(option),
        })),
        'divider',
        {
            label: sidebarOpen ? 'Hide library' : 'Show library',
            onSelect: () => setSidebarOpen(!sidebarOpen),
        },
    ];

    return (
        <header className={ 'menubar' }>
            <nav>
                <button className={ 'circle transparent menubar-toggle' }
                    aria-label={ sidebarOpen ? 'Hide library' : 'Show library' }
                    aria-pressed={ sidebarOpen }
                    onClick={ () => setSidebarOpen(!sidebarOpen) }>
                    <MenuIcon />
                </button>

                <svg className={ 'menubar-mark' }
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    aria-hidden="true">
                    <circle cx="12"
                        cy="12"
                        r="10.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5" />
                    <circle cx="12"
                        cy="12"
                        r="6.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        opacity="0.5" />
                    <circle cx="12"
                        cy="12"
                        r="1.75"
                        fill="currentColor" />
                </svg>
                <h1>SpinDex</h1>

                <div className={ 'menubar-menus' }>
                    <Menu label={ 'File' }
                        triggerClassName={ 'menubar-item' }
                        items={ [
                            ...newItems,
                            'divider',
                            {
                                label: 'Export as CSV',
                                icon: <DownloadIcon fontSize={ 'small' } />,
                                disabled: !viewingTracking,
                                onSelect: () => viewingTracking && exportTracking(viewingTracking.id),
                            },
                        ] } />
                    <Menu label={ 'Measurement' }
                        triggerClassName={ 'menubar-item' }
                        items={ trackingItems(viewingTracking) } />
                    <Menu label={ 'View' }
                        triggerClassName={ 'menubar-item' }
                        items={ viewItems } />
                </div>

                <span className={ 'max' } />

                {compare.length > 0 && (
                    <button className={ `transparent menubar-compare ${ viewMode === 'compare' ? 'selected' : '' }` }
                        onClick={ () => setViewMode('compare') }
                        aria-label={ `Compare ${ compare.length } measurements` }>
                        <CompareArrowsIcon fontSize={ 'small' } />
                        <span className={ 'menubar-label' }>Compare</span>
                        <span className={ 'menubar-badge' }>{compare.length}</span>
                    </button>
                )}

                {activeTracking ? (
                    <button className={ 'menubar-record recording' }
                        onClick={ () => stopTracking() }
                        aria-label={ 'Stop recording' }>
                        <StopIcon fontSize={ 'small' } />
                        <span className={ 'menubar-label' }>Stop</span>
                    </button>
                ) : (
                    <button className={ 'primary menubar-record' }
                        onClick={ () => openDialog({ kind: 'newMeasurement' }) }
                        aria-label={ 'New measurement' }>
                        <FiberManualRecordIcon fontSize={ 'small' } />
                        <span className={ 'menubar-label' }>New measurement</span>
                    </button>
                )}

                <span className={ 'menubar-sep' } />

                <span className={ `status-dot ${ connected ? 'connected' : '' }` }
                    aria-hidden="true" />
                <p className={ 'status-text' }>{status || 'Not Connected'}</p>
                <button
                    onClick={ () => {
                        initBluetooth();
                    } }
                    disabled={ available === false }
                    title={ available === false ? 'Turn on Bluetooth to connect' : undefined }
                    aria-label={ connected ? 'Connected' : 'Connect to SpinDex' }
                    className={ `circle small ${ connected ? '' : 'primary' } ${ isSearching ? 'searching' : '' }` }>
                    <BluetoothSearchingIcon fontSize={ 'small' } />
                </button>

                <div className={ 'menubar-overflow' }>
                    <Menu label={ <MoreVertIcon /> }
                        ariaLabel={ 'More' }
                        triggerClassName={ 'circle transparent' }
                        align={ 'end' }
                        items={ [...newItems, 'divider', ...viewItems] } />
                </div>
            </nav>
        </header>
    );
};
