import * as React from 'react';
import './button.scss';

export const Button = (props) => {
    return (
        <button disabled={ props.disabled } className={ `${'button button--' + props.type}` }
                onClick={ props.onClick }>{ props.children }</button>
    );
};
