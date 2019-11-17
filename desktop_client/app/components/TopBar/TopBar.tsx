import * as React from 'react';
import { ProfileButtons } from '../ProfileButtons/ProfileButtons';
import { Typography } from '../Typography/Typography';
import './topbar.scss';

export const TopBar = () => {
    return (
        <div className="topbar">
            <Typography>Profiles</Typography>

            <ProfileButtons/>
        </div>
    );
};
