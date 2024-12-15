import * as React from 'react';
import {IContextProps, IProps} from './types';
import {DataContext} from '../DataContext';

export const BLEContext = React.createContext({} as IContextProps);

export const BLEProvider = (props: IProps): React.ReactElement => {
    const {setData} = React.useContext(DataContext);

    const [deviceConnected, setDeviceConnected] = React.useState(false);
    const [device, setDevice] = React.useState<any>();
    const [status, setStatus] = React.useState<string>('');

    // const deviceName = 'SpinDex';
    const deviceName = 'Astraeus';
    const bleServiceId = '8abb038d-5a8d-4d29-ae05-0c1fd42583ab';
    const characteristicId = 'ea53154b-9815-4143-b717-d4e1de9f6cca';
    let bleServer;

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
            filters: [{name: deviceName}],
            optionalServices: [bleServiceId]
        }).then(device => {
            setStatus(`Device Connected: ${device.name}`);
            device.addEventListener('gattservicedisconnected', onDisconnected);
            return device.gatt.connect();
        }).then(gattServer => {
            bleServer = gattServer;
            setStatus('Connected to GATT Server');
            return bleServer.getPrimaryService(bleServiceId);
        }).then(service => {
            setStatus(`Service discovered: ${service.uuid}`);
            return service.getCharacteristic(characteristicId);
        }).then(characteristic => {
            setStatus(`Characteristic discovered: ${characteristic.uuid}`);
            characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
            characteristic.startNotifications();
            setStatus('Connection Established.');
            return characteristic.readValue();
        }).catch(error => {
            if (error && typeof error === "string" && error.indexOf("User cancelled") > 0) {
                setStatus(`Error: ${error}`);
            }
        });
    };

    const initBluetooth = async () => {
        if (isWebBluetoothEnabled()) {
            connectToDevice();
        }

        setStatus('Initializing Bluetooth...');
        (navigator as any).bluetooth.requestDevice({
            filters: [{name: deviceName}],
            optionalServices: [bleServiceId]
        }).then(device => {
            setStatus(`Device Selected: ${device.name}`);
            setDeviceConnected(true);
            setDevice(device);

            device.addEventListener('gattservicedisconnected', onDisconnected);
            return device.gatt.connect();
        }).then(gattServer => {
            bleServer = gattServer;
            setStatus('Connected to GATT Server');
            return bleServer.getPrimaryService(bleServiceId);
        }).then(service => {
            setStatus(`Service discovered: ${service.uuid}`);
            return service.getCharacteristic(characteristicId);
        }).then(characteristic => {
            setStatus(`Characteristic discovered: ${characteristic.uuid}`);
            characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicChange);
            characteristic.startNotifications();
            setStatus('Connection Established.');
            return characteristic.readValue();
        }).catch(error => {
            if (error && typeof error === "string" && error.indexOf("User cancelled") > 0) {
                setStatus(`Error: ${error}`);
            }
        });
    };

    const onDisconnected = (event) => {
        setStatus(`Device Disconnected: ${event.target.device.name}`);
        setDeviceConnected(false);
        setDevice(undefined)
        // connectToDevice();
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
