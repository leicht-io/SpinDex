import * as React from 'react';
import {IContextProps, IProps} from './types';
import {TrackingContext} from '../TrackingContext';

export const BLEContext = React.createContext({} as IContextProps);

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

const UNSUPPORTED_STATUS = 'Web Bluetooth API is not available in this browser!';
const UNAVAILABLE_STATUS = 'Bluetooth is turned off or no adapter was found.';

export const BLEProvider = (props: IProps): React.ReactElement => {
    const {recordSample} = React.useContext(TrackingContext);

    // The characteristic listener below is registered once per connection
    // and so closes over whatever render it was created in. Calling
    // recordSample through a ref keeps it pointed at the latest one --
    // otherwise a tracking started *after* pairing is never seen (the
    // captured recordSample still has activeTrackingId === null), so no
    // samples are persisted and the chart stays empty until a refresh
    // resumes the tracking before re-pairing.
    const recordSampleRef = React.useRef(recordSample);
    recordSampleRef.current = recordSample;

    const [deviceConnected, setDeviceConnected] = React.useState(false);
    const [device, setDevice] = React.useState<BluetoothDevice | undefined>();
    const [status, setStatus] = React.useState<string>('');
    // null until the first availability check resolves.
    const [available, setAvailable] = React.useState<boolean | null>(null);

    const deviceName = 'SpinDex';
    const bleServiceId = '8abb038d-5a8d-4d29-ae05-0c1fd42583ab';
    const characteristicId = 'ea53154b-9815-4143-b717-d4e1de9f6cca';

    const reconnectAttemptsRef = React.useRef(0);
    const reconnectTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

    React.useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    // getAvailability() reports whether a usable Bluetooth adapter is
    // present *and* switched on (navigator.bluetooth existing only means
    // the browser supports the API). Checked on load so the user sees
    // "Bluetooth is off" up front rather than an empty device picker, and
    // re-checked on availabilitychanged so toggling the adapter updates it.
    React.useEffect(() => {
        if (!navigator.bluetooth) {
            setAvailable(false);
            setStatus(UNSUPPORTED_STATUS);
            return;
        }

        let cancelled = false;
        const checkAvailability = (): void => {
            navigator.bluetooth.getAvailability()
                .then((isAvailable: boolean) => {
                    if (cancelled) {
                        return;
                    }
                    setAvailable(isAvailable);
                    setStatus(prev => {
                        if (!isAvailable) {
                            return UNAVAILABLE_STATUS;
                        }
                        return prev === UNAVAILABLE_STATUS ? '' : prev;
                    });
                })
                .catch(() => {
                    // Can't tell (e.g. blocked by permissions policy) --
                    // don't block the user, let requestDevice() report it.
                    if (!cancelled) {
                        setAvailable(true);
                    }
                });
        };

        checkAvailability();
        navigator.bluetooth.addEventListener('availabilitychanged', checkAvailability);

        return () => {
            cancelled = true;
            navigator.bluetooth.removeEventListener('availabilitychanged', checkAvailability);
        };
    }, []);

    const isWebBluetoothEnabled = async (): Promise<boolean> => {
        if (!navigator.bluetooth) {
            setStatus(UNSUPPORTED_STATUS);
            return false;
        }

        const isAvailable = await navigator.bluetooth.getAvailability().catch(() => true);
        setAvailable(isAvailable);
        if (!isAvailable) {
            setStatus(UNAVAILABLE_STATUS);
            return false;
        }
        return true;
    };

    const handleCharacteristicChange = (event: Event): void => {
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        const newValueReceived = new TextDecoder().decode(characteristic.value);
        const latestValue = Number(newValueReceived);

        // A truncated/garbled notification (BLE fragmentation, a stray
        // empty write) can decode to "" or non-numeric text -- Number(...)
        // turns that into NaN (or, for "", 0, which is a legitimate reading
        // and fine to keep). A NaN sample would poison this tracking's
        // running sum/max forever (Math.max(x, NaN) is always NaN) and,
        // once bucketed for the chart, invalidate the SVG path it lands in
        // — collapsing the *entire* visible line, not just that one point.
        // Simplest fix: never record a reading that isn't an actual number.
        if (!Number.isFinite(latestValue)) {
            return;
        }

        recordSampleRef.current(latestValue);
    };

    // Connects GATT on an already-picked device (no requestDevice() picker
    // involved), so this can run both right after the user selects a device
    // and, later, from the reconnect loop with no user gesture available.
    const attachToDevice = (selectedDevice: BluetoothDevice): Promise<void> => {
        if (!selectedDevice.gatt) {
            return Promise.reject(new Error('Selected device has no GATT server.'));
        }

        return selectedDevice.gatt.connect()
            .then((gattServer: BluetoothRemoteGATTServer) => {
                setStatus('Connected to GATT Server');
                return gattServer.getPrimaryService(bleServiceId);
            })
            .then((service: BluetoothRemoteGATTService) => {
                setStatus(`Service discovered: ${service.uuid}`);
                return service.getCharacteristic(characteristicId);
            })
            .then((characteristic: BluetoothRemoteGATTCharacteristic) => {
                setStatus(`Characteristic discovered: ${characteristic.uuid}`);
                characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
                characteristic.startNotifications();
                setStatus('Connection Established.');
                setDeviceConnected(true);
                reconnectAttemptsRef.current = 0;
            });
    };

    // Retries attachToDevice() with capped exponential backoff, indefinitely
    // — this is meant to ride out a multi-hour unattended tracking run, so
    // it doesn't give up after N attempts, only slows down to a 30s cadence.
    const scheduleReconnect = (disconnectedDevice: BluetoothDevice): void => {
        reconnectAttemptsRef.current += 1;
        const attempt = reconnectAttemptsRef.current;
        const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1), RECONNECT_MAX_DELAY_MS);

        setStatus(`Disconnected — reconnecting in ${Math.round(delay / 1000)}s (attempt ${attempt})…`);

        reconnectTimeoutRef.current = setTimeout(() => {
            attachToDevice(disconnectedDevice).catch(() => {
                scheduleReconnect(disconnectedDevice);
            });
        }, delay);
    };

    const onDisconnected = (event: Event): void => {
        const disconnectedDevice = event.target as BluetoothDevice;
        setDeviceConnected(false);
        scheduleReconnect(disconnectedDevice);
    };

    const handleConnectionError = (error: unknown): void => {
        // requestDevice()/gatt.connect() reject with a DOMException, not a
        // string, so read its .message (e.g. "User cancelled the
        // requestDevice() chooser." on cancel).
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`Error: ${message}`);
        setDeviceConnected(false);
    };

    const connectToDevice = (): void => {
        setStatus('Initializing Bluetooth...');
        navigator.bluetooth.requestDevice({
            filters: [{name: deviceName}],
            optionalServices: [bleServiceId]
        }).then((selectedDevice: BluetoothDevice) => {
            setStatus(`Device Selected: ${selectedDevice.name}`);
            setDevice(selectedDevice);
            selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);
            reconnectAttemptsRef.current = 0;

            return attachToDevice(selectedDevice).catch((error: unknown) => {
                // A device is already picked at this point, so treat a
                // failed first connection the same as a mid-session drop
                // and keep retrying instead of dead-ending.
                handleConnectionError(error);
                scheduleReconnect(selectedDevice);
            });
        }).catch(handleConnectionError); // requestDevice() itself failed/was cancelled — nothing to retry against
    };

    const initBluetooth = async (): Promise<void> => {
        if (await isWebBluetoothEnabled()) {
            connectToDevice();
        }
    };

    return (
        <BLEContext.Provider value={{
            connected: deviceConnected,
            available,
            initBluetooth,
            status,
            device
        }}>
            {props.children}
        </BLEContext.Provider>
    );
};

export const BLEConsumer = BLEContext.Consumer;
