import * as React from 'react';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Typography } from '../Typography/Typography';
import './topbar.scss';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const TopBar = () => {
    const [showDialog, setShowDialog] = React.useState<boolean>(false);
    const [profileName, setProfileName] = React.useState<string>('');

    return (
        <React.Fragment>
            { showDialog &&
            <Dialog
                showKeyboard={ showDialog }
                onKeyboardChange={ (value) => {
                    setProfileName(value);
                } }
                title="Create Profile"
                acceptDisabled={ profileName === null }
                onAccept={ () => {
                    if (profileName) {
                        webSocket.send(JSON.stringify({type: 'createProfile', name: profileName}));
                        webSocket.send(JSON.stringify({type: 'getProfiles', name: profileName}));
                        setShowDialog(false);
                        setProfileName('');
                    }
                } }
                onCancel={ () => {
                    setShowDialog(false);
                    setProfileName('');
                } }>
                <p>Enter the profile name below and click accept. <b>Creating a new
                    profile will stop all running profiles.</b></p>
                <input type="text" value={ profileName } autoFocus={ true } readOnly={ true } />
            </Dialog>
            }

            <div className="topbar">
                <div className="topbar--left">
                    <Typography>Profiles</Typography>

                    <Button
                        type="default"
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
