export interface IProps {
  children: any;
}

export interface IContextProps {
  devicePath: string | null;
  deviceConnected: boolean;
  webSocket: WebSocket;
}
