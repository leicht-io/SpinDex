import * as React from 'react';
import {IContextProps, IProps} from './types';
import {DataContext} from '../DataContext';

export const BLEContext = React.createContext({} as IContextProps);

export const BLEProvider = (props: IProps): React.ReactElement => {
    const {setData} = React.useContext(DataContext);

    const [deviceConnected, setDeviceConnected] = React.useState(false);
    const [device, setDevice] = React.useState<BluetoothDevice | undefined>();
    const [status, setStatus] = React.useState<string>('');

    const deviceName = 'SpinDex';
    const bleServiceId = '8abb038d-5a8d-4d29-ae05-0c1fd42583ab';
    const characteristicId = 'ea53154b-9815-4143-b717-d4e1de9f6cca';
    let bleServer: BluetoothRemoteGATTServer;

    const isWebBluetoothEnabled = (): boolean => {
        if (!navigator.bluetooth) {
            setStatus('Web Bluetooth API is not available in this browser!');
            return false;
        }
        setStatus('Web Bluetooth API supported in this browser.');
        return true;
    };

    // Connect to BLE Device and Enable Notifications
    const connectToDevice = (): void => {
        setStatus('Initializing Bluetooth...');
        navigator.bluetooth.requestDevice({
            filters: [{name: deviceName}],
            optionalServices: [bleServiceId]
        }).then((selectedDevice: BluetoothDevice) => {
            setStatus(`Device Selected: ${selectedDevice.name}`);
            setDeviceConnected(true);
            setDevice(selectedDevice);

            selectedDevice.addEventListener('gattserverdisconnected', onDisconnected);

            if (!selectedDevice.gatt) {
                throw new Error('Selected device has no GATT server.');
            }

            return selectedDevice.gatt.connect();
        }).then((gattServer: BluetoothRemoteGATTServer) => {
            bleServer = gattServer;
            setStatus('Connected to GATT Server');
            return bleServer.getPrimaryService(bleServiceId);
        }).then((service: BluetoothRemoteGATTService) => {
            setStatus(`Service discovered: ${service.uuid}`);
            return service.getCharacteristic(characteristicId);
        }).then((characteristic: BluetoothRemoteGATTCharacteristic) => {
            setStatus(`Characteristic discovered: ${characteristic.uuid}`);
            characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
            characteristic.startNotifications();
            setStatus('Connection Established.');
            return characteristic.readValue();
        }).catch((error: unknown) => {
            // requestDevice()/gatt.connect() reject with a DOMException, not a
            // string, so read its .message (e.g. "User cancelled the
            // requestDevice() chooser." on cancel).
            const message = error instanceof Error ? error.message : String(error);
            setStatus(`Error: ${message}`);
            setDeviceConnected(false);
            setDevice(undefined);
        });
    };

    const initBluetooth = async (): Promise<void> => {
        if (isWebBluetoothEnabled()) {
            connectToDevice();
        }
    };

    const onDisconnected = (event: Event): void => {
        const disconnectedDevice = event.target as BluetoothDevice;
        setStatus(`Device Disconnected: ${disconnectedDevice.name}`);
        setDeviceConnected(false);
        setDevice(undefined)
        // connectToDevice();
    };

    const handleCharacteristicChange = (event: Event): void => {
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        const newValueReceived = new TextDecoder().decode(characteristic.value);
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
