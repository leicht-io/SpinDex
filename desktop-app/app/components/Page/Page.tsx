import * as React from 'react';
import './page.scss';

export const Page = (props: any) => {
    return (
        <div className="page">
            { props.children }
        </div>
    );
};
