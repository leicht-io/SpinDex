import * as React from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import './dashboard.scss';
import { Box, Card, CardContent, CircularProgress, Grid, Typography } from '@mui/material';

import { Page } from '../../components';
import { WSContext } from '../../context';
import moment from 'moment';

export const Dashboard = () => {
  const { deviceConnected, webSocket } = React.useContext(WSContext);

  const [data, setData] = React.useState<{ rpm: number; temperature: number; timestamp: number }[]>([]);
  const [latestPoint, setLatestPoint] = React.useState<number>();
  const [minValue, setMinValue] = React.useState<number>(99);
  const [maxValue, setMaxValue] = React.useState<number>(-1);
  const [errorRate, setErrorRate] = React.useState<number>(-1);

  React.useEffect(() => {
    let errors: number = 0;
    data.forEach(item => {
      const rpm = item.rpm;
      const deviation = 0.05;
      if(Math.abs((rpm - 33.33)) > deviation) {
        errors++;
      }
    });

    const errorPercentage = (data.length / 100) * errors;
    setErrorRate(errorPercentage);
  }, [data]);

  webSocket.onmessage = (event: any) => {
    const parsedEvent = JSON.parse(event.data);
    if (parsedEvent.type === 'rpm') {
      setLatestPoint(parsedEvent.value);
      if(parsedEvent.value < minValue) {
        setMinValue(parsedEvent.value);
      }
      if(parsedEvent.value > maxValue) {
        setMaxValue(parsedEvent.value);
      }

      const value = Number(parsedEvent.value);
      if (!isNaN(value)) {
        const lastEntry = data[data.length - 1];
        setData(data.concat([{
          rpm: value,
          temperature: lastEntry !== undefined ? lastEntry.temperature : 0.0,
          timestamp: Date.now()
        }]));
      }
    }
  };

  return (
    <Page>
      {!deviceConnected && (
        <Box sx={ { display: 'flex', height: 620, width: '100%', justifyContent: 'center', alignItems: 'center' } }>
          <CircularProgress />
        </Box>
      )}

      {deviceConnected && data.length > 0 && (
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
                    Max: {maxValue}
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
                    Error rate: {errorRate} %
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
                        dataKey="rpm"
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
