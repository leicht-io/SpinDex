import * as React from 'react';
import './hotspot-card-container.scss';

export const HotSpotCardContainer = (props: any) => {

    return (
        <div className="hotspot-card-container">
            { props.children }
        </div>
    );
};
