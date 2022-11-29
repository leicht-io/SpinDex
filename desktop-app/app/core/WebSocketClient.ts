interface SocketOptions {
    protocols: string[];
    maxAttempts: number;
    timeout: number;

    onMessage: (e) => void;
    onOpen: (e) => void;
    onClose: (e) => void;
    onMaximum: (e) => void;
    onReconnect: (e) => void;
    onError: (e) => void;
}

export class WebSocketClient {
    private webSocket: WebSocket | null = null;
    private reconnectIterator = 0;
    private timer;
    private readonly url: string;
    private readonly options: SocketOptions;

    constructor(url: string, options: SocketOptions) {
        this.url = url;
        this.options = options;

        this.open();
    }

    public open() {
        this.webSocket = new WebSocket(this.url, this.options.protocols || '');

        this.webSocket.onmessage = (e) => {
            this.options.onMessage(this.deserialize(e.data));
        };

        this.webSocket.onopen = (e) => {
            this.options.onOpen(e);
            this.reconnectIterator = 0;
        };

        this.webSocket.onclose = (e) => {
            if (e.code === 1e3 || e.code === 1001 || e.code === 1005) {
                this.reconnect(e);
            }

            this.options.onClose(e);
        };

        this.webSocket.onerror = (e) => {
            if (this.webSocket && this.webSocket.readyState === WebSocket.CLOSING) {
                this.reconnect(e);
            } else {
                this.options.onError(e);
            }
        };
    }

    public reconnect(e) {
        if (this.timer && this.reconnectIterator++ < this.options.maxAttempts || Infinity) {
            this.timer = setTimeout(() => {
                this.options.onReconnect(e);
                this.open();
            }, this.options.timeout || 1e3);
        } else {
            this.options.onMaximum(e);
        }
    }

    public send(data: string) {
        if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            this.webSocket.send(this.serialize(data));
        }
    }

    public close() {
        this.timer = clearTimeout(this.timer);

        if (this.webSocket) {
            this.webSocket.close();
        }
    }

    private deserialize(data: string): any {
        return JSON.parse(data);
    }

    private serialize(data: any): string {
        return JSON.stringify(data);
    }
}
