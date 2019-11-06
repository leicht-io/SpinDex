import { Grid, makeStyles, Typography } from '@material-ui/core';
import * as React from 'react';

export const HotSpotCard = (props: any) => {
    const useStyles = makeStyles((theme) => ({
        gridItem: {
            'borderRight': '1px solid #ccc',
            '&:last-child': {
                borderRight: 'none'
            }
        }
    }));

    const classes = useStyles();

    return (
        <Grid item={ true } xs={ 3 } className={ classes.gridItem }>
            <div>
                <Typography variant="h6">
                    { props.title }
                </Typography>
                { props.value }
            </div>
        </Grid>
    );
};
