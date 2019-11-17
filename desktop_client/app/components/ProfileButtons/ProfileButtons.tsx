import * as React from 'react';
import { Button } from '../Button';
import './profile-buttons.scss';

export const ProfileButtons = () => {
    return (
        <div className="profile-buttons">
            <Button onClick={ () => {
                console.log('TODO: Add new profile');
            } }>New Profile</Button>
        </div>
    );
};
