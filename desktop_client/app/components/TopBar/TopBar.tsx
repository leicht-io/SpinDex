import * as React from 'react';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Typography } from '../Typography/Typography';
import './topbar.scss';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const TopBar = () => {
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
                        webSocket.send(JSON.stringify({type: 'getProfiles', name: profileName}));
                        setShowDialog(false);
                    }
                } }
                onCancel={ () => {
                    setShowDialog(false);
                } }>
                <p>Enter the profile name below (e.g. Beogram 4002, first test) and click accept.</p><p>Creating a new
                profile will stop all running profiles.</p>
                <input type="text" autoFocus={ true } onChange={ (event) => {
                    setProfileName(event.target.value);
                } } />
            </Dialog>
            }

            <div className="topbar">
                <div className="topbar--left">
                    <Typography>Profiles</Typography>

                    <Button
                        type="success"
                        onClick={ () => {
                            setShowDialog(true);
                        } }>
                        New Profile
                    </Button>
                </div>
            </div>
        </React.Fragment>
    );
};
