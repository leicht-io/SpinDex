export interface IProps {
    children: any;
}

export interface IContextProps {
    connected: boolean;
    // Bluetooth adapter present and switched on; null while still checking.
    available: boolean | null;
    initBluetooth: () => void;
    status: string;
    device: BluetoothDevice | undefined;
}