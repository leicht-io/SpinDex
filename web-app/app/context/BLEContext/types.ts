export interface IProps {
    children: any;
}

export interface IContextProps {
    connected: boolean;
    // The browser implements Web Bluetooth at all (and the page is a secure
    // context -- navigator.bluetooth is undefined over plain http).
    supported: boolean;
    // Bluetooth adapter present and switched on; null while still checking.
    available: boolean | null;
    initBluetooth: () => void;
    status: string;
    device: BluetoothDevice | undefined;
}