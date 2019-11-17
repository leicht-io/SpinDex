import * as React from 'react';
import './hotspot-card.scss';

export const HotSpotCard = (props: any) => {

    return (
        <div className="hotspot-card">
            <div>
                { props.title }
            </div>
            { props.value || props.children }
        </div>
    );
};
