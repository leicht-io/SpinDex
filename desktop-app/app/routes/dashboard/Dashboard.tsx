import moment = require('moment');
import * as React from 'react';
import {CartesianGrid, Label, Line, LineChart, ResponsiveContainer, XAxis, YAxis} from 'recharts';
import {Divider} from '../../components/Divider';
import {HotSpotCard} from '../../components/HotSpotCard';
import {HotSpotCardContainer} from '../../components/HotSpotCardContainer';
import './dashboard.scss';
import {Card, CardContent, Container, Grid} from "@mui/material";
import {Page} from "../../components/Page";

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const Dashboard = () => {
    const [currentRPM, setCurrentRPM] = React.useState<number>(0.00);
    const [currentTemperature, setCurrentTemperature] = React.useState<number>(0.00);
    const [currentData, setCurrentData] = React.useState<{ rpm: number, temperature: number, timestamp: number }[]>([]);

    webSocket.onopen = () => {
        console.log('socket open!');
    };

    webSocket.onmessage = (event: any) => {
        const parsedEvent = JSON.parse(event.data);
        if (parsedEvent.type === 'rpm') {
            const value = Number(parsedEvent.value);
            if (!isNaN(value)) {
                setCurrentRPM(value);

                const lastEntry = currentData[currentData.length - 1];
                setCurrentData(currentData.concat([{
                    rpm: value,
                    temperature: lastEntry !== undefined ? lastEntry.temperature : 0.0,
                    timestamp: Date.now()
                }]));
            }
        } else if (parsedEvent.type === 'temperature') {
            const value = Number(parsedEvent.value);
            if (!isNaN(value)) {
                setCurrentTemperature(value);

                const lastEntry = currentData[currentData.length - 1];
                setCurrentData(currentData.concat([{
                    rpm: lastEntry !== undefined ? lastEntry.rpm : 0.0,
                    temperature: value,
                    timestamp: Date.now()
                }]));
            }
        }
    };

    return (
        <Page>
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <HotSpotCard theme='light' title="RPM" value={ currentRPM.toFixed(2) } />
                    </Grid>
                    <Grid item xs={6}>
                        <HotSpotCard theme='light' title="Temperature" value={ currentTemperature.toFixed(2) + ' °C' } />
                    </Grid>
                </Grid>


            <Divider />

            <Card>
                <CardContent>
                {currentData.length === 0 && (
                    <>
                    <p>Waiting for data...</p>
                    </>
                )}

                {currentData.length > 0 && (
                    <ResponsiveContainer height={ 324 } width="100%">
                        <LineChart data={ currentData } baseValue={0} margin={ {bottom: -10, top: 0, right: 0, left: -35} }>
                            <Line type="linear" dataKey="rpm" stroke="#8884d8" strokeWidth={ 1 } isAnimationActive={ false }
                                  dot={ false } />
                            <Line type="linear" dataKey="temperature" stroke="#8bc34a" strokeWidth={ 1 }
                                  isAnimationActive={ false }
                                  dot={ false } />
                            <CartesianGrid stroke="#d8d8d8" strokeDasharray="5 5" strokeWidth={ 1 } />
                            <XAxis tickCount={ 5 } type={ 'number' } domain={ ['auto', 'auto'] } dataKey="timestamp"
                                   tickFormatter={ (tick) => {
                                       return moment(tick).format('HH:mm:ss');
                                   } }>
                                <Label value={ 'Time' } className={ 'x-label' } offset={ -16 } position="insideBottom" />
                            </XAxis>
                            <YAxis label={ {
                                className: 'y-label',
                                value: 'RPM',
                                angle: -90,
                                position: 'insideLeft',
                                offset: 10
                            } } />
                        </LineChart>
                    </ResponsiveContainer>
                )}
                </CardContent>
            </Card>
        </Page>
    );
};
