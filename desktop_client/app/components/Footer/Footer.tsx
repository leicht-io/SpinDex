import * as React from 'react';
import './footer.scss';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const Footer = () => {
    const [devicePath, setDevicePath] = React.useState<string | null>(null);
    const [initial, setInitial] = React.useState<boolean>(true);

    const getContent = () => {
        let interval;
        webSocket.onopen = (event) => {
            interval = setInterval(() => {
                if (!devicePath) {
                    webSocket.send(JSON.stringify({type: 'getDeviceInfo'}));
                } else {
                    clearInterval(interval);
                }
            }, 1500);

            webSocket.onmessage = (event: any) => {
                const parsedEvent = JSON.parse(event.data);
                if (parsedEvent.type === 'deviceInfo') {
                    setDevicePath((parsedEvent.value));
                    setInitial(false);
                    // webSocket.close();
                }

                console.log('deviceRemoved', parsedEvent);
                if (parsedEvent.type === 'deviceRemoved') {
                    console.log('deviceRemoved');
                    setInitial(false);
                    setDevicePath(null);
                }
            };
        };
    };
    getContent();

    let footerContent: JSX.Element;
    if (initial) {
        footerContent = <p>Please wait...</p>;
        setTimeout(() => {
            setInitial(false);
        }, 2500);
    } else {
        if (devicePath) {
            footerContent = <p>Connected to tachometer on <b>{ devicePath }</b>.</p>;
        } else {
            footerContent = <p>No tachometer found. Please plug it in.</p>;
        }
    }

    return (
        <div className="footer">
            { footerContent }
        </div>
    );
};
