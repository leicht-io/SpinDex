import { Pane, Text } from 'evergreen-ui';
import * as React from 'react';

export const HotSpotCard = (props: any) => {

    return (
        <Pane>
            <Text>
                { props.title }
            </Text>
            { props.value }
        </Pane>
    );
};
