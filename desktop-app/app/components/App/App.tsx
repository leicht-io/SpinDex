import * as React from 'react';
import './app.scss';

export const App = (props: any) => {
    return (
        <div>
            { props.children }
        </div>
    );
};
