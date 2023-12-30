import * as React from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import './dashboard.scss';
import { Box, Card, CardContent, CircularProgress, Grid, Typography } from '@mui/material';
import { Page } from '../../components';
import moment from 'moment';
import { BLEContext, DataContext } from '../../context';

export const Dashboard = () => {
  const { connected, status } = React.useContext(BLEContext);
  const { data } = React.useContext(DataContext);

  const [latestPoint, setLatestPoint] = React.useState<number>();
  const [minValue, setMinValue] = React.useState<number>(99);
  const [maxValue, setMaxValue] = React.useState<number>(-1);

  React.useEffect(() => {
    if(data.length > 0) {
      const newestPoint = data[data.length - 1].value;
      setLatestPoint(newestPoint);
      if (newestPoint < minValue) {
        setMinValue(newestPoint);
      }
      if (newestPoint > maxValue) {
        setMaxValue(newestPoint);
      }
    }
  }, [data]);

  return (
    <Page>
      {!connected && (
        <Box sx={ { display: 'flex', height: 620, width: '100%', justifyContent: 'center', alignItems: 'center' } }>
          <CircularProgress />
          <p>{status}</p>
        </Box>
      )}

      {connected && data.length > 0 && (
        <>
          <Grid container={ true }
            spacing={ 2 }>
            <Grid xs={ 4 }
              item={ true }>
              <Card>
                <CardContent>
                  <Typography
                    sx={ { fontSize: 14 } }
                    color="text.secondary"
                    gutterBottom={ true }>
                    Latest reading: {latestPoint} RPM
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid xs={ 4 }
              item={ true }>
              <Card>
                <CardContent>
                  <Typography
                    sx={ { fontSize: 14 } }
                    color="text.secondary"
                    gutterBottom={ true }>
                    Min: {minValue}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid
              xs={ 4 }
              item={ true }>
              <Card>
                <CardContent>
                  <Typography
                    sx={ { fontSize: 14 } }
                    color="text.secondary"
                    gutterBottom={ true }>
                    Max: {maxValue}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={ 12 }
              item={ true }>
              <Card style={ { height: 620 } }>
                <CardContent>
                  <ResponsiveContainer
                    height={ 580 }
                    width="100%">
                    <ComposedChart
                      data={ data }
                      margin={ { bottom: -10, top: 0, right: 0, left: 0 } }>
                      <Line
                        type="linear"
                        dataKey="value"
                        stroke="#8884d8"
                        strokeWidth={ 1 }
                        isAnimationActive={ false }
                        dot={ false } />
                      <CartesianGrid
                        stroke="#d8d8d8"
                        strokeDasharray="3 3"
                        strokeWidth={ 1 } />
                      <XAxis
                        scale={ 'linear' }
                        type={ 'number' }
                        domain={ ['dataMin', 'dataMax'] }
                        dataKey="timestamp"
                        tickFormatter={ (tick) => {
                          return moment(tick).format('HH:mm');
                        } } />
                      <YAxis
                        unit={ ' RPM' }
                        scale={ 'linear' }
                        ticks={ [0, 33.33, 45, 50] }
                        domain={ [0, 50] } />
                      <ReferenceLine y={ 33.33 }
                        stroke="#969696"
                        strokeDasharray="5 5" />
                      <ReferenceLine y={ 45 }
                        stroke="#969696"
                        strokeDasharray="5 5" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

        </>
      )}
    </Page>
  );
};
