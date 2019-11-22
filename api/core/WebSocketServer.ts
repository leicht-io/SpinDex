import * as http from 'http';
import * as WebSocket from 'ws';

export class WebSocketServer {
    private port: number = 1337;

    constructor(port: number) {
        this.port = port;

        this.createWebSocketServer();
    }

    private createHttpServer(): any {
        const httpServer = http.createServer((request, response) => {
        });

        httpServer.listen(this.port, () => {
        });

        return httpServer;
    }

    private createWebSocketServer() {
        const webSocketServer = new WebSocket.Server({server: this.createHttpServer()});

        webSocketServer.on('request', (request) => {
            const connection = request.accept(null, request.origin);

            connection.on('message', (message) => {
                if (message.type === 'utf8') {
                    // process WebSocket message
                }
            });

            connection.on('close', (connection) => {

            });
        });
    }

}
