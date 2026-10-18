import * as React from 'react';
import './menubar.scss';
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';
import BluetoothDisabledIcon from '@mui/icons-material/BluetoothDisabled';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StopIcon from '@mui/icons-material/Stop';
import { BLEContext, TrackingContext, UIContext } from '../../context';
import { Menu, MenuEntry, useActionMenus } from '../Menu';
import { SpinDexMark } from '../Logo';

export const MenuBar = (): React.ReactElement => {
    const { initBluetooth, status, connected, supported, available } = React.useContext(BLEContext);
    const {
        activeTracking,
        viewingTracking,
        stopTracking,
        exportTracking,
        windowOptions,
        selectedWindow,
        setSelectedWindow,
    } = React.useContext(TrackingContext);
    const { viewMode, setViewMode, compare, setSidebarOpen, openDialog } = React.useContext(UIContext);
    const { trackingItems, newItems } = useActionMenus();

    // The BLE status is a loose set of human-readable sentences (see
    // BLEContext), not an enum, so this is a best-effort read of "an attempt
    // is in flight" purely to drive the button's pulse animation.
    const isSearching = !connected && available !== false && status !== ''
        && !status.startsWith('Error') && !status.includes('not available');
    const bluetoothUnusable = !supported || available === false;

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
    ];

    return (
        <header className={ 'menubar' }>
            <nav>
                {/* Phones only: the library is a drawer there. On wider screens
                    it's always docked and this button is hidden. */}
                <button className={ 'circle transparent menubar-toggle' }
                    aria-label={ 'Open library' }
                    onClick={ () => setSidebarOpen(true) }>
                    <MenuIcon />
                </button>

                <div className={ 'menubar-brand' }>
                    <SpinDexMark size={ 28 }
                        spinning={ activeTracking !== null && connected } />
                    <h1>SpinDex</h1>
                </div>

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
                    <button className={ `border menubar-compare ${ viewMode === 'compare' ? 'selected' : '' }` }
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
                        <span className={ 'rec-dot' } />
                        <span className={ 'menubar-label' }>New measurement</span>
                    </button>
                )}

                <span className={ 'menubar-sep' } />

                {/* When Web Bluetooth can't be used at all, the button explains
                    why instead of sitting there disabled. */}
                <button
                    onClick={ () => {
                        if (bluetoothUnusable) {
                            openDialog({ kind: 'bluetoothHelp' });
                        } else {
                            initBluetooth();
                        }
                    } }
                    title={ bluetoothUnusable ? 'Bluetooth unavailable — read more' : (connected ? 'Connected' : 'Connect to SpinDex') }
                    aria-label={ bluetoothUnusable ? 'Bluetooth unavailable, read more' : (connected ? 'Connected' : 'Connect to SpinDex') }
                    className={ `square small menubar-link ${ connected ? 'connected' : '' } ${ bluetoothUnusable ? 'unusable' : '' } ${ isSearching ? 'searching' : '' }` }>
                    {bluetoothUnusable
                        ? <BluetoothDisabledIcon fontSize={ 'small' } />
                        : <BluetoothSearchingIcon fontSize={ 'small' } />}
                </button>

                <div className={ 'menubar-overflow' }>
                    <Menu label={ <MoreVertIcon /> }
                        ariaLabel={ 'More' }
                        triggerClassName={ 'square transparent' }
                        align={ 'end' }
                        items={ [...newItems, 'divider', ...viewItems] } />
                </div>
            </nav>
        </header>
    );
};
