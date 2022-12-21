import * as React from 'react';
import './sidebar.scss';
import { Button, Stack } from '@mui/material';
import moment from 'moment';
import { WSContext } from '../../context';

export const Sidebar = (): React.ReactElement => {
  const { webSocket } = React.useContext(WSContext);

  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = React.useState<number>(0);

  webSocket.onopen = () => {
    webSocket.send(JSON.stringify({ type: 'getProfiles' }));

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
          const startDate = moment(profile.start).format('DD-MM-YYYY HH:MM:ss');
          const endDate = moment(profile.finish).format('DD-MM-YYYY HH:MM:ss');

          // TODO: Update this value
          let durationHours;
          if (!profile.finish) {
            durationHours = moment.duration(moment().diff(moment(profile.start))).asHours().toFixed(2);
          } else {
            durationHours = moment.duration(moment(profile.finish).diff(moment(profile.start))).asHours().toFixed(2);
          }

          return (
            <div
              onClick={ () => {
                setSelectedProfile(index);
              } }
              className={ `sidebar-item sidebar-item-${ profile.active === true ? 'active' : 'inactive' } ${ selectedProfile === index ? 'sidebar-item--selected' : '' } ` }
              key={ index }>
              <p>{profile.name} ({profile.id})</p>

              <table>
                <tr>
                  <td>
                    <small><b>Status:</b></small>
                  </td>
                  <td><small>{`${ profile.active === true ? 'Running' : 'Done' } `}</small></td>
                </tr>
                <tr>
                  <td>
                    <small><b>Started:</b></small>
                  </td>
                  <td><small>{startDate}</small></td>
                </tr>
                {profile.finish &&
                <tr>
                  <td>
                    <small><b>Ended:</b></small>
                  </td>
                  <td><small>{endDate}</small></td>
                </tr>
                }

                <tr>
                  <td>
                    <small><b>Duration:</b></small>
                  </td>
                  <td><small>{durationHours} hours</small></td>
                </tr>
              </table>

              {profile.active && (
                <Stack spacing={ 2 }
                  direction="row">
                  <Button
                    variant="contained"
                    size={ 'small' }
                    disabled={ profiles && profiles[selectedProfile] && profiles && profiles[selectedProfile].finish !== null || (!profiles || profiles && profiles.length === 0) }
                    color="warning"
                    onClick={ () => {
                      webSocket.send(JSON.stringify({
                        type: 'stopProfile',
                        id: profiles[selectedProfile].id
                      }));
                      webSocket.send(JSON.stringify({ type: 'getProfiles' }));
                    } }>
                    Stop
                  </Button>
                  <Button
                    fullWidth={ true }
                    variant="outlined"
                    size={ 'small' }
                    disabled={ profiles && profiles[selectedProfile] && profiles && profiles[selectedProfile].finish !== null || (!profiles || profiles && profiles.length === 0) }
                    color="error"
                    onClick={ () => {
                      webSocket.send(JSON.stringify({
                        type: 'deleteProfile',
                        id: profiles[selectedProfile].id
                      }));
                      webSocket.send(JSON.stringify({ type: 'getProfiles' }));
                    } }>
                    Delete
                  </Button>
                </Stack>
              )}
            </div>
          );
        })
      }

      {!profiles || profiles.length === 0 ? <div className="no-profile-yet">No profiles yet...</div> : ''}
    </div>
  );
};
