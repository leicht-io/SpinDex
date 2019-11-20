import * as React from 'react';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import './profile-buttons.scss';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const ProfileButtons = () => {
    const [showDialog, setShowDialog] = React.useState<boolean>(false);
    const [profileName, setProfileName] = React.useState<string | null>(null);
    return (
        <React.Fragment>
            { showDialog &&
            <Dialog
                title="Create Profile"
                acceptDisabled={ profileName === null }
                onAccept={ () => {
                    if (profileName) {
                        webSocket.send(JSON.stringify({type: 'createProfile', name: profileName}));
                        setShowDialog(false);
                    }
                } }
                onCancel={ () => {
                    setShowDialog(false);
                } }>
                <p>Create new profile.</p>
                <input type="text" onChange={ (event) => {
                    setProfileName(event.target.value);
                } } />
            </Dialog>
            }

            <div className="profile-buttons">
                <Button onClick={ () => {
                    setShowDialog(true);
                } }>New Profile</Button>
            </div>
        </React.Fragment>
    );

};
