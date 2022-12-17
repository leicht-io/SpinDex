import * as React from 'react';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import './dialog.scss';
import * as T from './types';
import {Button} from "@mui/material";

export const Dialog = (props: T.IProps) => {
    const classes: string = 'dialog-wrapper ' + (props.showKeyboard ? 'dialog-with-keyboard' : '');
    const [layout, setLayout] = React.useState<'default' | 'shift'>('default');
    const onChange = (input) => {
        if (props.onKeyboardChange) {
            props.onKeyboardChange(input);
        }
    };

    const onKeyPress = (button) => {
        if (button.includes('{') && button.includes('}')) {
            handleLayoutChange(button);
        }
    };

    const handleLayoutChange = (button) => {
        let layoutName;

        switch (button) {
            case '{shift}':
            case '{shiftactivated}':
            case '{default}':
                layoutName = layout === 'default' ? 'shift' : 'default';
                break;
            default:
                break;
        }

        if (layoutName) {
            setLayout(layoutName);
        }
    };

    return (
        <div className={ classes }
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
                    <Button color="warning" onClick={ props.onCancel }>Cancel</Button>
                    <Button color="success" disabled={ props.acceptDisabled } onClick={ props.onAccept }>Accept</Button>
                </div>
            </div>

            { props.showKeyboard &&
            <Keyboard
                theme={ 'hg-theme-default hg-theme-ios' }
                layoutName={ layout }
                layout={ {
                    default: [
                        'q w e r t y u i o p {bksp}',
                        'a s d f g h j k l',
                        '{shift} z x c v b n m {shift}',
                        '{space}'
                    ],
                    shift: [
                        'Q W E R T Y U I O P {bksp}',
                        'A S D F G H J K L',
                        '{shiftactivated} Z X C V B N M {shiftactivated}',
                        '{space}'
                    ],
                } }
                display={ {
                    '{shift}': '⇧',
                    '{shiftactivated}': '⇧',
                    '{enter}': 'return',
                    '{bksp}': '⌫',
                    '{space}': 'space',
                    '{default}': 'ABC',
                    '{back}': '⇦'
                } }

                keyboardRef={ () => {
                } }
                onKeyPress={ onKeyPress }
                onChange={ onChange } /> }
        </div>);
};
