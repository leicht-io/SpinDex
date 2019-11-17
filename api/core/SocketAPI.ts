import * as http from 'http';
import * as WebSocket from 'ws';
import { RPM } from '../routes/RPM';

export class SocketAPI {
    private database: any;
    private app: any;
    private portNumber: number = 3000;

    constructor(database: any, app: any) {
        this.database = database;
        this.app = app;
    }

    public startAPI() {
        const server: any = http.createServer(this.app);
        const wss: any = new WebSocket.Server({server});

        wss.on('connection', (ws: WebSocket) => {
            console.log('WS connection OPEN');
            ws.on('message', (message: string) => {
                const parsedMessage: any = JSON.parse(message);

                if (parsedMessage.type === 'add') {
                    RPM.add(parsedMessage.value, this.database).then((response) => {
                        ws.send(JSON.stringify(response));
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
            this.database.run('CREATE TABLE IF NOT EXISTS rpm (value NUMBER, timestamp NUMBER)');
        });
    }
}