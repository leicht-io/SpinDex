import * as http from 'http';
import { Server } from 'http';
import * as WebSocket from 'ws';
import { Profile, RPM, Temperature } from '../routes';

export class SocketAPI {
  private app: any;
  private portNumber = 3000;
  private deviceInfo = null;
  private httpServer: Server;
  private webSocketServer: WebSocket.Server;

  constructor(app: any) {
    this.app = app;

    const server: any = http.createServer(this.app);
    this.httpServer = server;
    this.webSocketServer = new WebSocket.Server({ server });
  }

  public startSocket() {
    this.webSocketServer.on('connection', (ws: WebSocket) => {
      ws.on('message', (message: string) => {
        const parsedMessage: any = JSON.parse(message);

        switch (parsedMessage.type) {
          case 'addRPM':
            Profile.hasActiveProfile().then((activeProfile) => {
              if (activeProfile.active) {
                RPM.add(parsedMessage.value, activeProfile.id || '').then((response) => {
                  // Do nothing
                });
              }

              // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
              this.webSocketServer.clients.forEach(function each(client) {
                client.send(JSON.stringify({
                  type: 'rpm',
                  value: parsedMessage.value,
                  timestamp: Date.now()
                }));
              });
            });
            break;
          case 'addTemperature':
            Profile.hasActiveProfile().then((activeProfile) => {
              if (activeProfile.active) {
                Temperature.add(parsedMessage.value, activeProfile.id).then((response) => {
                  // Do nothing
                });
              }

              // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
              this.webSocketServer.clients.forEach(function each(client) {
                client.send(JSON.stringify({
                  type: 'temperature',
                  value: parsedMessage.value,
                  timestamp: Date.now()
                }));
              });
            });
            break;
          case 'setDeviceInfo':
            this.deviceInfo = parsedMessage;
            break;
          case 'createProfile':
            Profile.createProfile(parsedMessage.name).then((response) => {
              Profile.getProfiles().then((profiles) => {
                this.webSocketServer.clients.forEach((client) => {
                  client.send(JSON.stringify(profiles));
                });
              });
            });
            break;
          case 'getProfiles':
            Profile.getProfiles().then((profiles) => {
              this.webSocketServer.clients.forEach((client) => {
                client.send(JSON.stringify(profiles));
              });
            });
            break;
          case 'deleteProfile':
            Profile.deleteProfile(parsedMessage.id).then((profiles) => {
              this.webSocketServer.clients.forEach((client) => {
                client.send(JSON.stringify(profiles));
              });
            });
            break;
          case 'stopProfile':
            Profile.stopProfile(parsedMessage.id).then((profiles) => {
              this.webSocketServer.clients.forEach((client) => {
                client.send(JSON.stringify(profiles));
              });
            });
            break;
          case 'deviceRemoved':
            this.deviceInfo = null;

            this.webSocketServer.clients.forEach((client) => {
              client.send(JSON.stringify({ type: 'deviceRemoved' }));
            });
            break;
          case 'getDeviceInfo':
            this.webSocketServer.clients.forEach((client) => {
              if (this.deviceInfo) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                this.deviceInfo.type = 'deviceInfo';
                client.send(JSON.stringify(this.deviceInfo));
              }
            });
            break;
        }
      });
    });

    this.httpServer.listen(this.portNumber, () => {
      // eslint-disable-next-line no-console
      console.log('HTTP server started on port 3000');
    });
  }

  public stopSocket() {
    this.webSocketServer.close();
    this.httpServer.close();
  }

}
