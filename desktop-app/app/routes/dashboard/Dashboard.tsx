import moment = require('moment');
import * as React from 'react';
import {CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis} from 'recharts';
import './dashboard.scss';
import {Box, Card, CardContent, CircularProgress} from "@mui/material";
import {Page} from "../../components/Page";
import {WSContext} from "../../context";

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const Dashboard = () => {
    const {deviceConnected} = React.useContext(WSContext);

    const [data, setData] = React.useState<{ rpm: number, temperature: number, timestamp: number }[]>([]);

    webSocket.onmessage = (event: any) => {
        const parsedEvent = JSON.parse(event.data);
        if (parsedEvent.type === 'rpm') {
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
                <Box sx={{display: 'flex', height: 620, width: "100%", justifyContent: "center", alignItems: "center"}}>
                    <CircularProgress/>
                </Box>
            )}

            {deviceConnected && data.length > 0 && (
                <Card style={{height: 620}}>
                    <CardContent>
                        <ResponsiveContainer height={580} width="100%">
                            <LineChart data={data} margin={{bottom: -10, top: 0, right: 0, left: 0}}>
                                <Line
                                    type="linear"
                                    dataKey="rpm"
                                    stroke="#8884d8"
                                    strokeWidth={1}
                                    isAnimationActive={false}
                                    dot={false}/>
                                <CartesianGrid
                                    stroke="#d8d8d8"
                                    strokeDasharray="3 3"
                                    strokeWidth={1}/>
                                <XAxis
                                    scale={"linear"}
                                    type={'number'}
                                    domain={['dataMin', "dataMax"]}
                                    dataKey="timestamp"
                                    tickFormatter={(tick) => {
                                        return moment(tick).format('HH:mm');
                                    }}/>
                                <YAxis
                                    unit={" RPM"}
                                    scale={"linear"}
                                    ticks={[0, 33.33, 45, 50]}
                                    domain={[0, 50]}/>
                                <ReferenceLine y={33.33} stroke="#969696" strokeDasharray="5 5"/>
                                <ReferenceLine y={45} stroke="#969696" strokeDasharray="5 5"/>
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

            )}
        </Page>
    );
};
