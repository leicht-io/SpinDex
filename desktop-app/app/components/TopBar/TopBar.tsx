import * as React from 'react';
import { Button } from '../Button';
import { Dialog } from '../Dialog';
import { Typography } from '../Typography/Typography';
import {AppBar, Fab, IconButton, Toolbar} from "@mui/material";
import NavigationIcon from '@mui/icons-material/Navigation';
import AddIcon from '@mui/icons-material/Add';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const TopBar = () => {
    const [showDialog, setShowDialog] = React.useState<boolean>(false);
    const [profileName, setProfileName] = React.useState<string>('');

    return (
        <>
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

            <AppBar position="fixed">
                <Toolbar variant="dense">
                    <NavigationIcon sx={{ mr: 1 }} />

                    <Typography variant="h6" color="inherit" component="div">
                        Astreaus
                    </Typography>
                </Toolbar>
            </AppBar>

            <Fab
                onClick={ () => {
                    setShowDialog(true);
                } }
                style={{
                    margin: 0,
                    top: 'auto',
                    right: 20,
                    bottom: 20,
                    left: 'auto',
                    position: 'fixed',
                }}
                variant="extended" color="primary" aria-label="add">
                <NavigationIcon sx={{ mr: 1 }} />
                New Profile
            </Fab>
        </>
    );
};


