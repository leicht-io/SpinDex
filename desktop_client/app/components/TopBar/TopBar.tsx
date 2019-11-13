import { Pane, Text, ThemeConsumer } from 'evergreen-ui';
import * as React from 'react';

export const TopBar = () => {
    return (
        <ThemeConsumer>
            { (theme) => (
                <Pane display="flex" elevation={ 2 } background={ theme.colors.background.overlay } height={ 64 } margin={ 0 }
                      padding={ 0 }>
                    <Text>Pane</Text>
                </Pane>)
            }
        </ThemeConsumer>

    );
};
