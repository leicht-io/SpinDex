import * as React from 'react';
import './sidebar.scss';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const Sidebar = () => {
    const [profiles, setProfiles] = React.useState();

    webSocket.onopen = () => {
        webSocket.send(JSON.stringify({type: 'getProfiles'}));

        webSocket.onmessage = (event) => {
            const parsedEvent = JSON.parse(event.data);

            if (parsedEvent.type === 'profiles') {
                parsedEvent.data.sort((a, b) => {
                    if (Number(a.start) > Number(b.start)) {
                        return -1;
                    }
                    if (Number(b.start) > Number(a.start)) {
                        return 1;
                    }
                    return 0;
                });

                setProfiles(parsedEvent.data);
            }
        };
    };

    return (
        <div className="sidebar">
            {
                profiles && profiles.map((profile, index) => {
                    const date = new Date(Number(profile.start)).toISOString().slice(0, 19).replace('T', ' ');

                    return (
                        <div className="sidebar-item" key={index}>
                            <p>{profile.name} ({profile.id})</p>
                            <span><small><b>Start:</b> {date} </small> | <small><b>End:</b> </small></span>
                        </div>
                    );
                })
            }
        </div>
    );
};
