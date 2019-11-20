import * as React from 'react';
import { Button } from '../Button';
import './profile-buttons.scss';

export const ProfileButtons = (props) => {

    return (
        <div className="profile-buttons--wrapper">
            <div className="profile-buttons">
                <Button
                    disabled={ props.selectedProfile && props.selectedProfile.finish !== null }
                    type="success"
                    onClick={ props.onStop }>
                    Stop Profile
                </Button>

                <Button
                    type="success"
                    onClick={ props.onDelete }>
                    Delete Profile
                </Button>
            </div>
        </div>
    );
};
