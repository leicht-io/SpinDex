import { Pane } from 'evergreen-ui';
import * as React from 'react';

export const App = (props: any) => {
    return (
        <Pane>
            { props.children }
        </Pane>
    );
};
