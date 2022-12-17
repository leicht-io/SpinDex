import * as React from 'react';
import {Dialog} from '../Dialog';
import {AppBar, Box, Button, Fab, Toolbar, Typography} from "@mui/material";
import NavigationIcon from '@mui/icons-material/Navigation';
import {WSContext} from "../../context";

export const TopBar = ():React.ReactElement => {
    const {devicePath, deviceConnected, webSocket} = React.useContext(WSContext);

    const [showDialog, setShowDialog] = React.useState<boolean>(false);
    const [profileName, setProfileName] = React.useState<string>('');

    return (
        <>
            {showDialog &&
                <Dialog
                    showKeyboard={showDialog}
                    onKeyboardChange={(value) => {
                        setProfileName(value);
                    }}
                    title="Create Profile"
                    acceptDisabled={profileName === null}
                    onAccept={() => {
                        if (profileName) {
                            webSocket.send(JSON.stringify({type: 'createProfile', name: profileName}));
                            webSocket.send(JSON.stringify({type: 'getProfiles', name: profileName}));

                            setShowDialog(false);
                            setProfileName('');
                        }
                    }}
                    onCancel={() => {
                        setShowDialog(false);
                        setProfileName('');
                    }}>
                    <p>Enter the profile name below and click accept. <b>Creating a new
                        profile will stop all running profiles.</b></p>
                    <input type="text" value={profileName} autoFocus={true} readOnly={true}/>
                </Dialog>
            }

            <Box sx={{flexGrow: 1}}>
                <AppBar position="fixed">
                    <Toolbar variant="dense">
                        <NavigationIcon sx={{mr: 1}}/>

                        <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                            Astreaus
                        </Typography>

                        <Button color="inherit">{(deviceConnected && devicePath) ? "Connected on " + devicePath : "Waiting for device"}</Button>
                    </Toolbar>
                </AppBar>
            </Box>

            <Fab
                onClick={() => {
                    setShowDialog(true);
                }}
                style={{
                    margin: 0,
                    top: 'auto',
                    right: 20,
                    bottom: 20,
                    left: 'auto',
                    position: 'fixed',
                }}
                variant="extended" color="primary" aria-label="add">
                New Profile
            </Fab>
        </>
    );
};


