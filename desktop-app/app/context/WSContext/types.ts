export interface IProps {
    children: any;
}

export interface IContextProps {
    devicePath: string;
    deviceConnected: boolean;
    webSocket: WebSocket;
}
