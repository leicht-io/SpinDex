import Readline from '@serialport/parser-readline';
import { app, BrowserWindow, Menu } from 'electron';
import SerialPort from 'serialport';
import WebSocket from 'ws';
import { API } from '../../api/API';

const nativeImage = require('electron').nativeImage;

export class Electron {
    private webSocket: WebSocket = new WebSocket('ws://localhost:3000');
    private port = null;
    private parser = new Readline();
    private webAPI: API = new API();
    private timeout: any;
    private sendMockData = true;

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

        // TODO: Handle different icons for different OS (.png, .ico)
        const image = nativeImage.createFromPath(app.getAppPath() + '/assets/icons/favicon.ico');

        const browserWindow = new BrowserWindow({
            width: 1024,
            height: 600,
            useContentSize: true,
            resizable: false,
            title: 'Astraeus',
            icon: image,
            webPreferences: {
                nodeIntegration: true,
            },
        });

         browserWindow.loadURL('http://localhost:1234');
    }

    private checkDevices() {
        SerialPort.list().then((devices) => {
            let deviceFound = false;
            devices.forEach((device) => {
                if (device.vendorId === '1A86' && device.productId === '7523') {
                    clearTimeout(this.timeout);
                    deviceFound = true;

                    this.port = new SerialPort(device.path, {baudRate: 38400});

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
                const rpm = JSON.stringify({
                    type: 'addRPM',
                    value: Number((Math.random() * (32.12 - 33.52) + 33.52).toFixed(2))
                });

                this.webSocket.send(rpm);

                const value = JSON.stringify({
                    type: 'addTemperature',
                    value: Number((Math.random() * (20.52 - 55.52) + 20.52).toFixed(2))
                });

                this.webSocket.send(value);
            }, 1000);
        } else {
            this.parser.on('data', (data: string) => {
                const parsedData = JSON.parse(data);
                if (parsedData.speed !== null && parsedData.speed !== undefined) {
                    const speed = parsedData.speed;

                    const value = JSON.stringify({type: 'addRPM', value: speed});

                    if (this.webSocket.readyState === WebSocket.OPEN) {
                        // TODO: This should be handled by the API
                        if (Number(speed) < 60) {
                            this.webSocket.send(value);
                        }
                    }
                } else if (parsedData.temperature !== null && parsedData.temperature !== undefined) {
                    JSON.stringify({type: 'addTemperature', value: parsedData.temperature});
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
