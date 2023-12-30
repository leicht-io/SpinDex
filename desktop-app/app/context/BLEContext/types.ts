export interface IProps {
  children: any;
}

export interface IContextProps {
  connected: boolean;
  initBluetooth: () => void;
  status: string;
  device: any;
}