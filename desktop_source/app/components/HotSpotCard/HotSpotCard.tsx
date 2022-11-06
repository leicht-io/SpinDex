import * as React from 'react';
import './hotspot-card.scss';

export const HotSpotCard = (props: any) => {

    const getContent = (): any => {
        if (props.value) {
            return <p>{ props.value }</p>;
        } else {
            return props.children;
        }
    };

    return (
        <div  className={ `${'hotspot-card hotspot-card--' + props.theme}` }>
            <h3>{ props.title }</h3>
            { getContent() }
        </div>
    );
};
