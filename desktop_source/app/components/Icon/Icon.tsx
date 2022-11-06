import React from 'react';
import './icon.scss';
import { icons } from './icons';
import { IProps } from './types';

export const Icon = (props: IProps) => {
    return (
        <div className="icon">
            { icons[props.icon] }
        </div>
    );
};
