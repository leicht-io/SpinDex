const {app, BrowserWindow} = require('electron');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const port = new SerialPort('COM4', {baudRate: 9600});
const fs = require('fs');
const fetch = require("node-fetch");

const parser = new Readline();
port.pipe(parser);

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

console.log("backend started");

SerialPort.list().then(response => {
    console.log(response)
})

parser.on('data', line => {
    fetch('http://localhost:3000/rpm/add', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({value: line})
    }).then(response => {
        console.log(response.status);
    })
});
