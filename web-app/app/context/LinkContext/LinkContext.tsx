import * as React from 'react';
import { ILinkContextProps, ILinkProviderProps, Transport, TransportLink, TransportState } from './types';
import { TrackingContext } from '../TrackingContext';
import { useBluetoothLink } from './useBluetoothLink';
import { useSerialLink } from './useSerialLink';
import { FirmwareBundle } from '../../core/firmware/firmwareBundle';
import { FlashCallbacks, flashFirmware } from '../../core/firmware/flashFirmware';

export const LinkContext = React.createContext({} as ILinkContextProps);

// The firmware reports every 500ms over both links, platter turning or not
// (stopped reads 0), so this long without a reading means it isn't coming.
const NO_DATA_AFTER_MS = 5_000;

export const isUsable = (state: TransportState): boolean => state.supported && state.available !== false;

export const transportLabel = (transport: Transport): string => (transport === 'usb' ? 'USB' : 'Bluetooth');

/**
 * The connection to the sensor, over whichever transport the user picked.
 * Only that one's readings are recorded, and picking the other one drops
 * it -- a sensor connected both ways would otherwise record every reading
 * twice.
 */
export const LinkProvider = (props: ILinkProviderProps): React.ReactElement => {
    const { recordSample, activeTracking } = React.useContext(TrackingContext);
    const recording = activeTracking !== null;

    const [transport, setTransport] = React.useState<Transport | null>(null);
    // For the links' callbacks, which can fire before a re-render has
    // caught up with a switch.
    const transportRef = React.useRef<Transport | null>(null);
    const selectTransport = (next: Transport | null): void => {
        transportRef.current = next;
        setTransport(next);
    };
    // The link whose picker was opened last. While nothing is connected,
    // its status (an error, say) is the one shown.
    const [attempted, setAttempted] = React.useState<Transport | null>(null);

    const lastSampleAtRef = React.useRef(0);
    const [noData, setNoData] = React.useState(false);
    const [receiving, setReceiving] = React.useState(false);

    const recordFrom = (source: Transport) => (value: number): void => {
        if (transportRef.current !== source) {
            return;
        }
        lastSampleAtRef.current = Date.now();
        setNoData(false);
        setReceiving(true);
        recordSample(value);
    };

    const bluetooth = useBluetoothLink(recordFrom('bluetooth'));
    const usb = useSerialLink(recordFrom('usb'));
    const linkFor = (which: Transport): TransportLink => (which === 'usb' ? usb : bluetooth);

    const active = transport ? linkFor(transport) : undefined;
    const connected = active?.connected ?? false;
    const shown = active ?? (attempted ? linkFor(attempted) : undefined);

    React.useEffect(() => {
        setNoData(false);
        setReceiving(false);
        if (!connected) {
            return;
        }

        lastSampleAtRef.current = Date.now();
        const intervalId = setInterval(() => {
            if (Date.now() - lastSampleAtRef.current > NO_DATA_AFTER_MS) {
                setNoData(true);
                setReceiving(false);
            }
        }, 1_000);
        return () => clearInterval(intervalId);
    }, [connected, transport]);

    // A reload in the middle of a recording: pick a USB sensor allowed on an
    // earlier visit back up, no picker needed (Bluetooth can't). Nothing
    // else connects on its own, so an idle tab leaves the port to other
    // tools.
    React.useEffect(() => {
        if (!recording || transportRef.current !== null) {
            return;
        }
        usb.resume()
            .then((resumed: boolean) => {
                if (!resumed) {
                    return;
                }
                if (transportRef.current === null) {
                    selectTransport('usb');
                } else if (transportRef.current !== 'usb') {
                    usb.disconnect(); // Bluetooth was picked meanwhile
                }
            })
            .catch(() => undefined);
    }, [recording]);

    const connectVia = async (next: Transport): Promise<void> => {
        const link = linkFor(next);
        if (transportRef.current === next && link.connected) {
            return;
        }

        setAttempted(next);
        if (!await link.connect()) {
            return;
        }

        const previous = transportRef.current;
        if (previous && previous !== next) {
            linkFor(previous).disconnect();
        }
        selectTransport(next);
    };

    const disconnect = (): void => {
        if (transportRef.current) {
            linkFor(transportRef.current).disconnect();
        }
        selectTransport(null);
    };

    const updateFirmware = async (bundle: FirmwareBundle, callbacks: FlashCallbacks): Promise<boolean> => {
        if (recording) {
            return false; // the dialog says so; the sensor can't measure meanwhile
        }
        // Over Bluetooth, the link rides out the sensor's restart by itself;
        // USB is only for the update then.
        const reattach = transportRef.current !== 'bluetooth';
        if (reattach) {
            setAttempted('usb');
        }
        const started = await usb.lendPort(port => flashFirmware(port, bundle, callbacks), {
            status: 'Updating the sensor firmware…',
            reattach,
        });
        if (started && reattach && transportRef.current !== 'bluetooth') {
            selectTransport('usb');
        }
        return started;
    };

    // Closing or reloading the tab mid-update would leave the sensor half
    // written (recoverable over USB, but avoidable): the browser asks first.
    React.useEffect(() => {
        if (!usb.lent) {
            return;
        }
        const onBeforeUnload = (event: BeforeUnloadEvent): void => {
            event.preventDefault();
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [usb.lent]);

    return (
        <LinkContext.Provider value={ {
            transport,
            connected,
            connecting: !connected && (shown?.connecting ?? false),
            status: shown?.status ?? '',
            problem: shown?.problem ?? null,
            firmwareVersion: connected ? active?.firmwareVersion ?? null : null,
            canConnect: isUsable(bluetooth) || isUsable(usb),
            noData: connected && noData,
            receiving: connected && receiving,
            bluetooth,
            usb,
            connect: (next: Transport) => {
                void connectVia(next);
            },
            disconnect,
            updating: usb.lent,
            updateFirmware,
        } }>
            {props.children}
        </LinkContext.Provider>
    );
};

export const LinkConsumer = LinkContext.Consumer;
