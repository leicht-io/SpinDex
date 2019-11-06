import { createMuiTheme, createStyles, makeStyles, Theme } from '@material-ui/core';
import teal from '@material-ui/core/colors/teal';
import { ThemeProvider } from '@material-ui/core/styles';
import * as React from 'react';

export const App = (props: any) => {
    const theme = React.useMemo(
        () =>
            createMuiTheme({
                palette: {
                    primary: teal,
                    type: 'light',
                },
            }),
        [],
    );

    const useStyles = makeStyles((theme: Theme) =>
        createStyles({
            root: {
                display: 'flex'
            }
        }),
    );

    const classes = useStyles(theme);

    return (
        <ThemeProvider theme={ theme }>
            <div className={ classes.root }>
                { props.children }
            </div>
        </ThemeProvider>
    );
};
