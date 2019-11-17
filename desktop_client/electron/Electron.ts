import Readline from '@serialport/parser-readline';
import { app, BrowserWindow, Menu } from 'electron';
import SerialPort from 'serialport';
import WebSocket from 'ws';
import { API } from '../../api/API';

export class Electron {
    private webSocket: WebSocket = new WebSocket('ws://localhost:3000');
    private port = new SerialPort('COM4', {baudRate: 9600});
    private parser = new Readline();
    private webAPI: API = new API();

    constructor() {
        this.port.pipe(this.parser);

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
        SerialPort.list().then((response: any) => {
            console.log(response);
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
