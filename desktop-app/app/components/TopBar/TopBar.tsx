import * as React from 'react';
import {
  AppBar,
  Box,
  Button,
  Dialog, DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Fab, TextField,
  Toolbar,
  Typography
} from '@mui/material';
import NavigationIcon from '@mui/icons-material/Navigation';
import { WSContext } from '../../context';

export const TopBar = (): React.ReactElement => {
  const { devicePath, deviceConnected, webSocket } = React.useContext(WSContext);

  const [showDialog, setShowDialog] = React.useState<boolean>(false);
  const [profileName, setProfileName] = React.useState<string>('');

  return (
    <>
      <Dialog
        open={ showDialog }
        onClose={ () => {
          setShowDialog(false);
          setProfileName('');
        } }
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">
          Create Profile
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            Enter the profile name below and click accept. <b>Creating a new
              profile will stop all running profiles.</b>
          </DialogContentText>
        </DialogContent>

        <DialogContent>
          <TextField
            fullWidth={ true }
            autoFocus={ true }
            value={ profileName }
            onChange={ (e) => {
              setProfileName(e.target.value);
            } }
            label="Profile Name"
            variant="outlined" />
        </DialogContent>
        <DialogActions>
          <Button
            color={ 'info' }
            onClick={ () => {
              setShowDialog(false);
              setProfileName('');
            } }>Cancel</Button>
          <Button
            disabled={ profileName.trim().length === 0 }
            onClick={ () => {
              if (profileName) {
                webSocket.send(JSON.stringify({ type: 'createProfile', name: profileName }));
                webSocket.send(JSON.stringify({ type: 'getProfiles', name: profileName }));

                setShowDialog(false);
                setProfileName('');
              }
            }
            }>Save</Button>
        </DialogActions>
      </Dialog>

      <Box sx={ { flexGrow: 1 } }>
        <AppBar position="fixed">
          <Toolbar variant="dense">
            <NavigationIcon sx={ { mr: 1 } } />

            <Typography variant="h6"
              component="div"
              sx={ { flexGrow: 1 } }>
              Astreaus
            </Typography>

            <Button color="inherit">{(deviceConnected && devicePath) ? `Connected on ${ devicePath }` : 'Waiting for device'}</Button>
          </Toolbar>
        </AppBar>
      </Box>

      <Fab
        onClick={ () => {
          setShowDialog(true);
        } }
        style={ {
          margin: 0,
          top: 'auto',
          right: 20,
          bottom: 20,
          left: 'auto',
          position: 'fixed',
        } }
        variant="extended"
        color="primary"
        aria-label="add">
        New Profile
      </Fab>
    </>
  );
};

