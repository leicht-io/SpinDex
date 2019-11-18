import * as React from 'react';
import './footer.scss';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const Footer = () => {
    const [devicePath, setDevicePath] = React.useState<string>('');

    webSocket.onopen = (event) => {
        webSocket.send(JSON.stringify({type: 'getDeviceInfo'}));

        webSocket.onmessage = (event: any) => {
            const parsedEvent = JSON.parse(event.data);
            if (parsedEvent.type === 'deviceInfo') {
                setDevicePath((parsedEvent.value));

                webSocket.close();
            }
        };
    };

    return (
        <div className="footer">
            <p>Connected to tachometer on <b>{ devicePath }</b>.</p>
        </div>
    );
};
