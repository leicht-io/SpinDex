import * as React from 'react';
import './button.scss';

export const Button = (props) => {
    return (
        <button disabled={ props.disabled } className="button" onClick={ props.onClick }>{ props.children }</button>
    );
};
