import * as React from 'react';
import './container.scss';

export const Container = (props: any) => {

    return (
        <div className="container">
            {props.children}
        </div>
    );
};
