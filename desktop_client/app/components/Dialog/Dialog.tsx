import * as React from 'react';
import { Button } from '../Button';
import './dialog.scss';
import * as T from './types';

export const Dialog = (props: T.IProps) => {
    return (
        <div className="dialog-wrapper"
             ref={ (reference: any) => {
                 setTimeout(() => {
                     if (reference) {
                         reference.classList.add('dialog-wrapper--visible');
                     }
                 }, 10);
             } }>
            <div className="dialog-container">
                <div className="dialog-title">
                    { props.title }
                </div>
                <div className="dialog-content">
                    { props.children }
                </div>
                <div className="dialog-buttons">
                    <Button type="danger" onClick={ props.onCancel }>Cancel</Button>
                    <Button type="success" disabled={ props.acceptDisabled } onClick={ props.onAccept }>Accept</Button>
                </div>
            </div>
        </div>
    );
};
