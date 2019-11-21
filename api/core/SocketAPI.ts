import * as http from 'http';
import { Database } from 'sqlite3';
import * as WebSocket from 'ws';
import { Profile } from '../routes/Profile';
import { RPM } from '../routes/RPM';
import { ORM } from './ORM';

export class SocketAPI {
    private database: Database = ORM.getInstance().getDatabase();
    private app: any;
    private portNumber: number = 3000;
    private deviceInfo = null;

    constructor(app: any) {
        this.app = app;
    }

    public startAPI() {
        const server: any = http.createServer(this.app);
        const wss: any = new WebSocket.Server({server});

        wss.on('connection', (ws: WebSocket) => {
            ws.on('message', (message: string) => {
                const parsedMessage: any = JSON.parse(message);
                if (parsedMessage.type === 'add') {
                    Profile.hasActiveProfile().then((activeProfile) => {
                        if (activeProfile.active) {
                            RPM.add(parsedMessage.value, activeProfile.id).then((response) => {
                            });
                        }

                        wss.clients.forEach(function each(client) {
                            client.send(JSON.stringify({value: parsedMessage.value, timestamp: Date.now()}));
                        });
                    });
                }

                if (parsedMessage.type === 'setDeviceInfo') {
                    this.deviceInfo = parsedMessage;
                }

                if (parsedMessage.type === 'createProfile') {
                    Profile.createProfile(parsedMessage.name).then((response) => {
                        Profile.getProfiles().then((profiles) => {
                            wss.clients.forEach((client) => {
                                client.send(JSON.stringify(profiles));
                            });
                        });
                    });
                }

                if (parsedMessage.type === 'getProfiles') {
                    Profile.getProfiles().then((profiles) => {
                        wss.clients.forEach((client) => {
                            client.send(JSON.stringify(profiles));
                        });
                    });
                }

                if (parsedMessage.type === 'deleteProfile') {
                    Profile.deleteProfile(parsedMessage.id).then((profiles) => {
                        wss.clients.forEach((client) => {
                            client.send(JSON.stringify(profiles));
                        });
                    });
                }

                if (parsedMessage.type === 'deviceRemoved') {
                    this.deviceInfo = null;

                    wss.clients.forEach((client) => {
                        client.send(JSON.stringify({type: 'deviceRemoved'}));
                    });
                }

                if (parsedMessage.type === 'getDeviceInfo') {
                    wss.clients.forEach((client) => {
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

        server.listen(this.portNumber, () => {
            console.log(`Server started on port ${this.portNumber}.`);

            this.createDatabase();
        });
    }

    public stopAPI() {
        this.database.close();
    }

    private createDatabase() {
        this.database.serialize(() => {
            // tslint:disable-next-line:no-console
            console.log('RPM database created.');
            this.database.run('CREATE TABLE IF NOT EXISTS rpm (value NUMBER, id: TEXT, timestamp NUMBER)');
            this.database.run('CREATE TABLE IF NOT EXISTS profile (name TEXT, id TEXT, start INTEGER, finish INTEGER, active BOOLEAN)');
        });
    }
}
