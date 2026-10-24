import { FirmwareBundle } from '../../core/firmware/firmwareBundle';
import { FlashCallbacks } from '../../core/firmware/flashFirmware';

export interface ILinkProviderProps {
    children: any;
}

// The two ways the browser can reach the sensor: Web Bluetooth, or a USB
// cable via Web Serial.
export type Transport = 'bluetooth' | 'usb';

// A failure the connection help has a specific fix for (shown behind the
// status bar's "Read more"). lostWhilePlugged: the browser dropped the port
// although the sensor is still plugged in. noReadings: the port opened but
// sent no readings, so it was let go of.
export type LinkProblem = 'lostWhilePlugged' | 'noReadings';

export interface TransportState {
    // The browser implements the API at all (and the page is a secure
    // context -- navigator.bluetooth/navigator.serial are undefined over
    // plain http).
    supported: boolean;
    // Bluetooth: adapter present and switched on; null while still
    // checking. USB has no adapter to check, so this just equals supported.
    available: boolean | null;
    connected: boolean;
    // A device is picked and being connected to, or the link dropped and
    // is waiting to come back.
    connecting: boolean;
    status: string;
    problem: LinkProblem | null;
    // What the sensor reported on connecting; null while unknown, and for
    // firmware from before it reported its version. Only meaningful while
    // connected: it may be left over from the last connection otherwise.
    firmwareVersion: string | null;
}

export interface TransportLink extends TransportState {
    // Opens the browser's device picker, so it must run inside a user
    // gesture. Resolves true once a device is picked (connecting carries on
    // in the background), false if the picker was cancelled or failed.
    connect: () => Promise<boolean>;
    // Drops the link and stops any attempt to bring it back.
    disconnect: () => void;
}

export interface ILinkContextProps {
    // The link readings are recorded from: the one picked last (or, for
    // USB, reattached on its own). null when neither is in use.
    transport: Transport | null;
    // `transport` is connected.
    connected: boolean;
    connecting: boolean;
    status: string;
    problem: LinkProblem | null;
    // `transport`'s sensor firmware version, while connected and known.
    firmwareVersion: string | null;
    // This browser can use at least one of the transports.
    canConnect: boolean;
    // Connected, but no reading has arrived for a while. Over USB that's
    // almost always sensor firmware from before USB output.
    noData: boolean;
    // A reading has arrived since connecting, and recently -- so the
    // latest value is live rather than left over.
    receiving: boolean;
    bluetooth: TransportState;
    usb: TransportState;
    // Must be called from a user gesture: it opens the browser's picker.
    connect: (transport: Transport) => void;
    disconnect: () => void;
    // A firmware update has the USB port (the only thing it's lent to).
    updating: boolean;
    // Flashes `bundle` over USB (see useSerialLink's updateFirmware), and
    // reads from the sensor over USB afterwards unless Bluetooth was in use.
    // Call it from a user gesture: it may open the browser's picker.
    updateFirmware: (bundle: FirmwareBundle, callbacks: FlashCallbacks) => Promise<boolean>;
}
