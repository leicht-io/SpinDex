const {app, BrowserWindow} = require('electron');
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const port = new SerialPort('COM3', {baudRate: 9600})

const parser = new Readline();
port.pipe(parser);

parser.on('data', line => console.log(`> ${line}`))


const mainWindow = function createWindow() {
    const window = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        },
        frame: false
    });

    window.loadURL('http://localhost:1234');
};

app.on('ready', mainWindow);
