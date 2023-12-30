import * as React from 'react';
import { IContextProps, IProps } from './types';
import { DataContext } from '../DataContext';

export const BLEContext = React.createContext({} as IContextProps);

export const BLEProvider = (props: IProps): React.ReactElement => {
  const { setData } = React.useContext(DataContext);

  const [deviceConnected, setDeviceConnected] = React.useState(false);
  const [device, setDevice] = React.useState<any>();
  const [status, setStatus ] = React.useState<string>('');

  const deviceName = 'ESP32';
  const bleService = '19b10000-e8f2-537e-4f6c-d104768a1214';
  const sensorCharacteristic = '19b10001-e8f2-537e-4f6c-d104768a1214';
  let bleServer;
  // let sensorCharacteristicFound;

  const isWebBluetoothEnabled = () => {
    if (!(navigator as any).bluetooth) {
      setStatus('Web Bluetooth API is not available in this browser!');
      return false;
    }
    setStatus('Web Bluetooth API supported in this browser.');
    return true;
  };

  // Connect to BLE Device and Enable Notifications
  const connectToDevice = () => {
    setStatus('Initializing Bluetooth...');
    (navigator as any).bluetooth.requestDevice({
      filters: [{ name: deviceName }],
      optionalServices: [bleService]
    }) .then(device => {
      setStatus(`Device Selected: ${ device.name }`);
      setStatus('device connected');
      device.addEventListener('gattservicedisconnected', onDisconnected);
      return device.gatt.connect();
    }).then(gattServer => {
      bleServer = gattServer;
      setStatus('Connected to GATT Server');
      return bleServer.getPrimaryService(bleService);
    }).then(service => {
      setStatus(`Service discovered: ${ service.uuid }`);
      return service.getCharacteristic(sensorCharacteristic);
    }).then(characteristic => {
      setStatus(`Characteristic discovered: ${ characteristic.uuid }`);
      // sensorCharacteristicFound = characteristic;
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
      characteristic.startNotifications();
      setStatus('Notifications Started.');
      return characteristic.readValue();
    }).catch(error => {
      setStatus(`Error: ${ error }`);
    });
  };

  const initBluetooth = async () => {
    if (isWebBluetoothEnabled()) {
      connectToDevice();
    }

    setStatus('Initializing Bluetooth...');
    (navigator as any).bluetooth.requestDevice({
      filters: [{ name: deviceName }],
      optionalServices: [bleService]
    }).then(device => {
      setStatus(`Device Selected: ${ device.name }`);
      setDeviceConnected(true);
      setDevice(device);

      device.addEventListener('gattservicedisconnected', onDisconnected);
      return device.gatt.connect();
    }).then(gattServer => {
      bleServer = gattServer;
      setStatus('Connected to GATT Server');
      return bleServer.getPrimaryService(bleService);
    }).then(service => {
      setStatus(`Service discovered: ${ service.uuid }`);
      return service.getCharacteristic(sensorCharacteristic);
    }).then(characteristic => {
      setStatus(`Characteristic discovered: ${ characteristic.uuid }`);
      //     sensorCharacteristicFound = characteristic;
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
      characteristic.startNotifications();
      setStatus('Notifications Started.');
      return characteristic.readValue();
    }).catch(error => {
      setStatus(`Error: ${ error }`);
    });
  };

  const onDisconnected = (event) => {
    setStatus(`Device Disconnected: ${ event.target.device.name }`);

    connectToDevice();
  };

  const handleCharacteristicChange = (event) => {
    const newValueReceived = new TextDecoder().decode(event.target.value);
    const latestValue = Number(newValueReceived);
    setData(latestValue);
  };

  /* const disconnectDevice = () => {
    setStatus('Disconnect Device.');
    if (bleServer && bleServer.connected) {
      if (sensorCharacteristicFound) {
        sensorCharacteristicFound.stopNotifications()
          .then(() => {
            setStatus('Notifications Stopped');
            return bleServer.disconnect();
          }).then(() => {
            setStatus('Device Disconnected');
          }).catch(error => {
            setStatus(`An error occurred: ${ error }`);
          });
      } else {
        setStatus('No characteristic found to disconnect.');
      }
    } else {
      setStatus('Bluetooth is not connected.');
    }
  }; */

  return (
    <BLEContext.Provider value={ {
      connected: deviceConnected,
      initBluetooth,
      status,
      device
    } }>
      {props.children}
    </BLEContext.Provider>
  );
};

export const BLEConsumer = BLEContext.Consumer;
