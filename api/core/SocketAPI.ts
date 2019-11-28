import * as http from 'http';
import { Server } from 'http';
import * as WebSocket from 'ws';
import { Profile } from '../routes/Profile';
import { RPM } from '../routes/RPM';
import { Temperature } from '../routes/Temperature';

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
        this.webSocketServer = new WebSocket.Server({server});
    }

    public startSocket() {
        this.webSocketServer.on('connection', (ws: WebSocket) => {
            ws.on('message', (message: string) => {
                const parsedMessage: any = JSON.parse(message);
                if (parsedMessage.type === 'addRPM') {
                    Profile.hasActiveProfile().then((activeProfile) => {
                        if (activeProfile.active) {
                            RPM.add(parsedMessage.value, activeProfile.id).then((response) => {

                            });
                        }

                        this.webSocketServer.clients.forEach(function each(client) {
                            client.send(JSON.stringify({
                                type: 'rpm',
                                value: parsedMessage.value,
                                timestamp: Date.now()
                            }));
                        });
                    });
                }

                if (parsedMessage.type === 'addTemperature') {
                    Profile.hasActiveProfile().then((activeProfile) => {
                        if (activeProfile.active) {
                            Temperature.add(parsedMessage.value, activeProfile.id).then((response) => {

                            });
                        }

                        this.webSocketServer.clients.forEach(function each(client) {
                            client.send(JSON.stringify({
                                type: 'temperature',
                                value: parsedMessage.value,
                                timestamp: Date.now()
                            }));
                        });
                    });
                }

                if (parsedMessage.type === 'setDeviceInfo') {
                    this.deviceInfo = parsedMessage;
                }

                if (parsedMessage.type === 'createProfile') {
                    Profile.createProfile(parsedMessage.name).then((response) => {
                        Profile.getProfiles().then((profiles) => {
                            this.webSocketServer.clients.forEach((client) => {
                                client.send(JSON.stringify(profiles));
                            });
                        });
                    });
                }

                if (parsedMessage.type === 'getProfiles') {
                    Profile.getProfiles().then((profiles) => {
                        this.webSocketServer.clients.forEach((client) => {
                            client.send(JSON.stringify(profiles));
                        });
                    });
                }

                if (parsedMessage.type === 'deleteProfile') {
                    Profile.deleteProfile(parsedMessage.id).then((profiles) => {
                        this.webSocketServer.clients.forEach((client) => {
                            client.send(JSON.stringify(profiles));
                        });
                    });
                }

                if (parsedMessage.type === 'deviceRemoved') {
                    this.deviceInfo = null;

                    this.webSocketServer.clients.forEach((client) => {
                        client.send(JSON.stringify({type: 'deviceRemoved'}));
                    });
                }

                if (parsedMessage.type === 'getDeviceInfo') {
                    this.webSocketServer.clients.forEach((client) => {
                        if (this.deviceInfo) {
                            // @ts-ignore
                            this.deviceInfo.type = 'deviceInfo';
                            client.send(JSON.stringify(this.deviceInfo));
                        }
                    });
                }

                /*if (parsedMessage.type === "getAll") {
                    RPM.getAll(this.database).then((response) => {
                        ws.send("OK");
                    });
                }*/
            });
        });

        this.httpServer.listen(this.portNumber, () => {
            // tslint:disable-next-line:no-console
            console.log('HTTP server started on port 3000');
        });
    }

    public stopSocket() {
        this.webSocketServer.close();
        this.httpServer.close();
    }

}
