import * as React from 'react';
import './menubar.scss';
import BluetoothIcon from '@mui/icons-material/Bluetooth';
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import HelpOutlinedIcon from '@mui/icons-material/HelpOutlined';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SensorsIcon from '@mui/icons-material/Sensors';
import SensorsOffIcon from '@mui/icons-material/SensorsOff';
import StopIcon from '@mui/icons-material/Stop';
import UsbIcon from '@mui/icons-material/Usb';
import { isUsable, LinkContext, TrackingContext, Transport, transportLabel, TransportState, UIContext } from '../../context';
import { Menu, MenuEntry, useActionMenus } from '../Menu';
import { SpinDexMark } from '../Logo';

export const MenuBar = (): React.ReactElement => {
    const { transport, connected, connecting, canConnect, bluetooth, usb, updating, connect, disconnect } = React.useContext(LinkContext);
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

    // Why an option can't be picked, or how the picked one is doing.
    const linkHint = (state: TransportState, which: Transport): string | undefined => {
        if (!state.supported) {
            return 'Not supported';
        }
        if (state.available === false) {
            return 'Turned off';
        }
        if (transport !== which) {
            return undefined;
        }
        return connected ? 'Connected' : (connecting ? 'Connecting…' : undefined);
    };

    const linkItems: MenuEntry[] = [
        { heading: 'Connect via' },
        {
            label: 'Bluetooth',
            icon: <BluetoothIcon fontSize={ 'small' } />,
            checked: transport === 'bluetooth',
            hint: linkHint(bluetooth, 'bluetooth'),
            disabled: !isUsable(bluetooth),
            onSelect: () => connect('bluetooth'),
        },
        {
            label: 'USB cable',
            icon: <UsbIcon fontSize={ 'small' } />,
            checked: transport === 'usb',
            hint: linkHint(usb, 'usb'),
            disabled: !isUsable(usb),
            onSelect: () => connect('usb'),
        },
        'divider',
        {
            label: 'Disconnect',
            icon: <LinkOffIcon fontSize={ 'small' } />,
            disabled: transport === null,
            onSelect: disconnect,
        },
        {
            label: 'Connection help…',
            icon: <HelpOutlinedIcon fontSize={ 'small' } />,
            onSelect: () => openDialog({ kind: 'connectionHelp' }),
        },
        'divider',
        {
            label: 'Update sensor firmware…',
            icon: <SystemUpdateAltIcon fontSize={ 'small' } />,
            hint: usb.supported ? (updating ? 'Updating…' : undefined) : 'Needs USB',
            onSelect: () => openDialog({ kind: 'firmwareUpdate' }),
        },
    ];

    const linkIcon = transport === 'usb'
        ? <UsbIcon fontSize={ 'small' } />
        : (transport === 'bluetooth' ? <BluetoothSearchingIcon fontSize={ 'small' } /> : <SensorsIcon fontSize={ 'small' } />);
    const linkTitle = transport && (connected || connecting)
        ? `${ connected ? 'Connected' : 'Connecting' } via ${ transportLabel(transport) }`
        : 'Connect to SpinDex';

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

                {/* Picks Bluetooth or USB. When this browser can do neither,
                    the button explains why instead of offering a menu of
                    disabled choices. */}
                {canConnect ? (
                    <Menu label={ linkIcon }
                        ariaLabel={ linkTitle }
                        title={ linkTitle }
                        triggerClassName={ `square small menubar-link ${ connected ? 'connected' : '' } ${ connecting ? 'searching' : '' }` }
                        align={ 'end' }
                        items={ linkItems } />
                ) : (
                    <button
                        onClick={ () => openDialog({ kind: 'connectionHelp' }) }
                        title={ 'Can’t connect from this browser — read more' }
                        aria-label={ 'Can’t connect from this browser, read more' }
                        className={ 'square small menubar-link unusable' }>
                        <SensorsOffIcon fontSize={ 'small' } />
                    </button>
                )}

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
