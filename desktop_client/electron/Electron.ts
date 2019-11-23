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
    private timeout: any;
    private sendMockData: boolean = false;

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
            resizable: false,
            title: 'Astraeus',
            webPreferences: {
                nodeIntegration: true,
            }
        });

        browserWindow.loadURL('http://localhost:1234');
    }

    private checkDevices() {
        SerialPort.list().then((devices) => {
            let deviceFound: boolean = false;
            devices.forEach((device) => {
                if (device.vendorId === '1A86' && device.productId === '7523') {
                    clearTimeout(this.timeout);
                    deviceFound = true;

                    this.port = new SerialPort(device.path, {baudRate: 9600});

                    if (this.port) {
                        // @ts-ignore
                        this.port.on('close', () => {
                            if (this.webSocket.readyState === 0) {
                                this.webSocket.on('open', () => {
                                    this.webSocket.send(JSON.stringify({type: 'deviceRemoved'}));
                                });
                            } else if (this.webSocket.readyState === 1) {
                                this.webSocket.send(JSON.stringify({type: 'deviceRemoved'}));
                            }

                            deviceFound = false;
                            this.checkDevices();
                        });
                    }

                    if (this.webSocket.readyState === 0) {
                        this.webSocket.on('open', () => {
                            this.webSocket.send(JSON.stringify({type: 'setDeviceInfo', value: device.path}));
                        });
                    } else if (this.webSocket.readyState === 1) {
                        this.webSocket.send(JSON.stringify({type: 'setDeviceInfo', value: device.path}));
                    }

                    this.startSerialConnection();
                }
            });

            if (!deviceFound) {
                this.timeout = setTimeout(() => {
                    this.checkDevices();
                }, 1000);
            }
        });
    }

    private sendDataToAPI() {
        if (this.sendMockData) {
            setInterval(() => {
                const value = JSON.stringify({
                    type: 'add',
                    value: Number((Math.random() * (32.12 - 33.52) + 33.52).toFixed(2))
                });

                this.webSocket.send(value);
            }, 1000);
        } else {
            this.parser.on('data', (line: string) => {
                const value = JSON.stringify({type: 'add', value: line});

                if (this.webSocket.readyState === WebSocket.OPEN) {
                    if (Number(line) < 60) {
                        this.webSocket.send(value);
                    } else {
                        console.log('false positive detected: ', line);
                    }
                }
            });
        }
    }

    private startAPI() {
        this.webAPI.startAPI();
    }

    private startWebClient() {

    }
}

// tslint:disable-next-line:no-unused-expression
new Electron();
