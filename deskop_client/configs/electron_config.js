const { app, BrowserWindow } = require('electron');

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
