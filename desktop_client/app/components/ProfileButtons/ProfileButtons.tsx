import * as React from 'react';
import { Button } from '../Button';
import './profile-buttons.scss';

export const ProfileButtons = (props: any) => {

    return (
        <div className="profile-buttons--wrapper">
            <div className="profile-buttons">
                <Button
                    disabled={ props.selectedProfile && props.selectedProfile.finish !== null || props.disabled }
                    type="warning"
                    onClick={ props.onStop }>
                    Stop Profile
                </Button>

                <Button
                    disabled={ props.disabled }
                    type="danger"
                    onClick={ props.onDelete }>
                    Delete Profile
                </Button>
            </div>
        </div>
    );
};
