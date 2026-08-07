import * as React from 'react';
import {IContextProps, IProps} from './types';
import {TrackingContext} from '../TrackingContext';

export const BLEContext = React.createContext({} as IContextProps);

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

export const BLEProvider = (props: IProps): React.ReactElement => {
    const {recordSample} = React.useContext(TrackingContext);

    const [deviceConnected, setDeviceConnected] = React.useState(false);
    const [device, setDevice] = React.useState<BluetoothDevice | undefined>();
    const [status, setStatus] = React.useState<string>('');

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

    const isWebBluetoothEnabled = (): boolean => {
        if (!navigator.bluetooth) {
            setStatus('Web Bluetooth API is not available in this browser!');
            return false;
        }
        setStatus('Web Bluetooth API supported in this browser.');
        return true;
    };

    const handleCharacteristicChange = (event: Event): void => {
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        const newValueReceived = new TextDecoder().decode(characteristic.value);
        const latestValue = Number(newValueReceived);
        recordSample(latestValue);
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
        if (isWebBluetoothEnabled()) {
            connectToDevice();
        }
    };

    return (
        <BLEContext.Provider value={{
            connected: deviceConnected,
            initBluetooth,
            status,
            device
        }}>
            {props.children}
        </BLEContext.Provider>
    );
};

export const BLEConsumer = BLEContext.Consumer;
