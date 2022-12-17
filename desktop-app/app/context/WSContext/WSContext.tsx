import * as React from 'react';
import * as T from './types';


export const WSContext = React.createContext({} as T.IContextProps);

export const WSProvider = (props: T.IProps): React.ReactElement => {
    const [devicePath, setDevicePath] = React.useState<string | null>(null);
    const [deviceConnected, setDeviceConnected] = React.useState<boolean>(false);
    const [webSocket, setWebSocket] = React.useState<WebSocket>();

    React.useEffect(() => {
        const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

        setWebSocket(webSocket);
    }, [])

    React.useEffect(() => {
        if (!webSocket) {
            return;
        }

        webSocket.onopen = () => {
            console.log("websocket ready")

            setTimeout(()=> {
                webSocket.send(JSON.stringify({
                    type: 'getDeviceInfo'
                }));
            }, 2500)
        };

        webSocket.onmessage = (event: any) => {
            const parsedEvent = JSON.parse(event.data);
            if (parsedEvent.type === 'deviceInfo') {
                setDevicePath(parsedEvent.value);
                setDeviceConnected(true)
            }

            if (parsedEvent.type === 'deviceRemoved') {
                setDevicePath(null);
                setDeviceConnected(false)
            }
        };
    }, [webSocket]);

    return (
        <WSContext.Provider value={{
            devicePath,
            deviceConnected,
            webSocket
        }}>
            {props.children}
        </WSContext.Provider>
    );
};

export const WSConsumer = WSContext.Consumer;
