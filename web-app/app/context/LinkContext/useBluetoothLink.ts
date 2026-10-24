import * as React from 'react';
import { TransportLink } from './types';
import { errorStatus } from './errorStatus';

const RECONNECT_BASE_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

const UNSUPPORTED_STATUS = 'Web Bluetooth API is not available in this browser!';
const UNAVAILABLE_STATUS = 'Bluetooth is turned off or no adapter was found.';

/**
 * Bluetooth link to the sensor over Web Bluetooth: picks the device,
 * subscribes to its RPM notifications and rides out dropped connections.
 * Each reading goes to `onSample`.
 */
export const useBluetoothLink = (onSample: (value: number) => void): TransportLink => {
    // The characteristic listener below is registered once per connection
    // and so closes over whatever render it was created in. Calling
    // onSample through a ref keeps it pointed at the latest one --
    // otherwise a tracking started *after* pairing is never seen (the
    // captured callback still has activeTrackingId === null), so no
    // samples are persisted and the chart stays empty until a refresh
    // resumes the tracking before re-pairing.
    const onSampleRef = React.useRef(onSample);
    onSampleRef.current = onSample;

    const [deviceConnected, setDeviceConnected] = React.useState(false);
    const [connecting, setConnecting] = React.useState(false);
    const [status, setStatus] = React.useState<string>('');
    // null until the first availability check resolves.
    const [available, setAvailable] = React.useState<boolean | null>(null);

    const deviceName = 'SpinDex';
    const bleServiceId = '8abb038d-5a8d-4d29-ae05-0c1fd42583ab';
    const characteristicId = 'ea53154b-9815-4143-b717-d4e1de9f6cca';

    // The device this link keeps connected, and the exact listener added to
    // it, so it can be removed again -- a re-picked device would otherwise
    // reconnect twice per drop.
    const deviceRef = React.useRef<BluetoothDevice | undefined>(undefined);
    const disconnectListenerRef = React.useRef<((event: Event) => void) | undefined>(undefined);
    // Bumped whenever a device is picked or let go of: a connect or
    // reconnect attempt whose number is no longer current stands down at its
    // next step. (Comparing devices instead wouldn't do -- the browser hands
    // back the same BluetoothDevice when the same sensor is picked again.)
    const attemptRef = React.useRef(0);
    const reconnectAttemptsRef = React.useRef(0);
    const reconnectTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

    // One function for the hook's lifetime, so adding it to a
    // characteristic that already has it (the same sensor re-picked, or a
    // reconnect handing back the same object) is a no-op rather than a
    // second listener recording every reading twice.
    const handleCharacteristicChange = React.useCallback((event: Event): void => {
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

        onSampleRef.current(latestValue);
    }, []);

    // Connects GATT on an already-picked device (no requestDevice() picker
    // involved), so this can run both right after the user selects a device
    // and, later, from the reconnect loop with no user gesture available.
    const attachToDevice = (selectedDevice: BluetoothDevice, attempt: number): Promise<void> => {
        if (!selectedDevice.gatt) {
            return Promise.reject(new Error('Selected device has no GATT server.'));
        }

        const isCurrent = (): boolean => attemptRef.current === attempt;
        const progress = (text: string): void => {
            if (isCurrent()) {
                setStatus(text);
            }
        };

        return selectedDevice.gatt.connect()
            .then((gattServer: BluetoothRemoteGATTServer) => {
                progress('Connected to GATT Server');
                return gattServer.getPrimaryService(bleServiceId);
            })
            .then((service: BluetoothRemoteGATTService) => {
                progress(`Service discovered: ${ service.uuid }`);
                return service.getCharacteristic(characteristicId);
            })
            .then((characteristic: BluetoothRemoteGATTCharacteristic) => {
                progress(`Characteristic discovered: ${ characteristic.uuid }`);
                characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
                return characteristic.startNotifications();
            })
            .then(() => {
                if (!isCurrent()) {
                    // Disconnected, or another device picked, while this was
                    // connecting. If it's the same device picked again, its
                    // GATT link belongs to the new attempt now.
                    if (deviceRef.current !== selectedDevice) {
                        selectedDevice.gatt?.disconnect();
                    }
                    return;
                }
                setStatus('Connection Established.');
                setDeviceConnected(true);
                setConnecting(false);
                reconnectAttemptsRef.current = 0;
            });
    };

    // Retries attachToDevice() with capped exponential backoff, indefinitely
    // — this is meant to ride out a multi-hour unattended tracking run, so
    // it doesn't give up after N attempts, only slows down to a 30s cadence.
    const scheduleReconnect = (disconnectedDevice: BluetoothDevice, attempt: number): void => {
        if (attemptRef.current !== attempt) {
            return;
        }

        reconnectAttemptsRef.current += 1;
        const tries = reconnectAttemptsRef.current;
        const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** (tries - 1), RECONNECT_MAX_DELAY_MS);

        setConnecting(true);
        setStatus(`Disconnected — reconnecting in ${ Math.round(delay / 1000) }s (attempt ${ tries })…`);

        reconnectTimeoutRef.current = setTimeout(() => {
            attachToDevice(disconnectedDevice, attempt).catch(() => {
                scheduleReconnect(disconnectedDevice, attempt);
            });
        }, delay);
    };

    const onDisconnected = (event: Event): void => {
        const disconnectedDevice = event.target as BluetoothDevice;
        if (deviceRef.current !== disconnectedDevice) {
            return;
        }
        setDeviceConnected(false);
        scheduleReconnect(disconnectedDevice, attemptRef.current);
    };

    // Lets go of the current device: in-flight and pending attempts stand
    // down, and its GATT link is closed if it's still up.
    const releaseDevice = (): void => {
        attemptRef.current += 1;
        const device = deviceRef.current;
        deviceRef.current = undefined;
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectAttemptsRef.current = 0;

        if (device && disconnectListenerRef.current) {
            device.removeEventListener('gattserverdisconnected', disconnectListenerRef.current);
        }
        disconnectListenerRef.current = undefined;
        if (device?.gatt?.connected) {
            device.gatt.disconnect();
        }
    };

    // Unmounted: drop the link and any pending reconnect.
    React.useEffect(() => {
        return () => releaseDevice();
    }, []);

    const connect = async (): Promise<boolean> => {
        if (!await isWebBluetoothEnabled()) {
            return false;
        }

        setStatus('Initializing Bluetooth...');
        let selectedDevice: BluetoothDevice;
        try {
            selectedDevice = await navigator.bluetooth.requestDevice({
                filters: [{ name: deviceName }],
                optionalServices: [bleServiceId]
            });
        } catch (error) {
            // requestDevice() itself failed/was cancelled — nothing to
            // retry against, and an existing connection is left alone.
            setStatus(errorStatus(error));
            return false;
        }

        // A device picked earlier may still be connected or reconnecting.
        releaseDevice();
        const attempt = attemptRef.current;
        deviceRef.current = selectedDevice;
        disconnectListenerRef.current = onDisconnected;
        selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);

        setStatus(`Device Selected: ${ selectedDevice.name }`);
        setDeviceConnected(false);
        setConnecting(true);

        attachToDevice(selectedDevice, attempt).catch((error: unknown) => {
            if (attemptRef.current !== attempt) {
                return;
            }
            // A device is already picked at this point, so treat a
            // failed first connection the same as a mid-session drop
            // and keep retrying instead of dead-ending.
            setStatus(errorStatus(error));
            scheduleReconnect(selectedDevice, attempt);
        });
        return true;
    };

    const disconnect = (): void => {
        releaseDevice();
        setDeviceConnected(false);
        setConnecting(false);
        setStatus('');
    };

    return {
        supported: typeof navigator !== 'undefined' && !!navigator.bluetooth,
        available,
        connected: deviceConnected,
        connecting,
        status,
        problem: null,
        connect,
        disconnect,
    };
};
