import * as React from 'react';
import { Button } from '../Button';
import './profile-buttons.scss';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const ProfileButtons = () => {

    return (
        <div className="profile-buttons">
            <Button onClick={ () => {
                webSocket.send(JSON.stringify({type: 'createProfile', name: 'Beogram 4002'}));
            } }>New Profile</Button>
        </div>
    );
};
