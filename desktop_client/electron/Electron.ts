import Readline from '@serialport/parser-readline';
import { app, BrowserWindow, Menu } from 'electron';
import SerialPort from 'serialport';
import WebSocket from 'ws';
import { API } from '../../api/API';

export class Electron {
    private webSocket: WebSocket = new WebSocket('ws://localhost:3000');
    private port = null;
    private parser = new Readline();
    private webAPI: API = new API();

    constructor() {

        app.on('ready', () => {
            this.startWebClient();
            this.createWindow();
            this.checkDevices();
            this.startAPI();
            this.sendDataToAPI();
        });

        app.on('before-quit', () => {
            this.webAPI.stopAPI();
        });
    }

    private startSerialConnection() {
        if (this.port !== null) {
            // @ts-ignore
            this.port.pipe(this.parser);
        }
    }

    private createWindow() {
        Menu.setApplicationMenu(null);

        const browserWindow = new BrowserWindow({
            width: 1280,
            height: 760,
            title: 'Astraeus',
            webPreferences: {
                nodeIntegration: true,
            }
        });

        browserWindow.loadURL('http://localhost:1234');
    }

    private checkDevices() {
        SerialPort.list().then((devices) => {
            devices.forEach((device) => {
                if (device.vendorId === '1A86' && device.productId === '7523') {
                    this.port = new SerialPort(device.path, {baudRate: 9600});

                    // @ts-ignore
                    this.webSocket.on('open', () => {
                        this.webSocket.send(JSON.stringify({type: 'setDeviceInfo', value: device.path}));
                    });
                    this.startSerialConnection();
                }
            });
        });
    }

    private sendDataToAPI() {
        this.parser.on('data', (line: string) => {
            const value = JSON.stringify({type: 'add', value: line});

            this.webSocket.send(value);
        });
    }

    private startAPI() {
        this.webAPI.startAPI();
    }

    private startWebClient() {

    }
}

// tslint:disable-next-line:no-unused-expression
new Electron();
