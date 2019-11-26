import moment = require('moment');
import * as React from 'react';
import { CartesianGrid, Label, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Divider } from '../../components/Divider';
import { HotSpotCard } from '../../components/HotSpotCard';
import './dashboard.scss';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const Dashboard = () => {
    const [currentRPM, setCurrentRPM] = React.useState<number>(0.00);
    const [currentData, setCurrentData] = React.useState<any>([]);

    webSocket.onopen = () => {
        console.log('socket open!');
    };

    webSocket.onmessage = (event) => {
        const value = Number(JSON.parse(event.data).value);
        if (!isNaN(value)) {
            setCurrentRPM(value);

            setCurrentData(currentData.concat([{value: value, timestamp: Date.now()}]));
        }
    };

    return (
        <div>
            <HotSpotCard title="RPM" value={ currentRPM.toFixed(2) } />

            <Divider />

            <HotSpotCard>
                <ResponsiveContainer height={ 385 } width="100%">
                    <LineChart data={ currentData } baseValue={ 0 } margin={ {bottom: 20, left: -0} }>
                        <Line type="linear" dataKey="value" stroke="#8884d8" strokeWidth={ 2 } isAnimationActive={ false }
                              dot={ false } />
                        <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                        <XAxis tickCount={ 5 } type={ 'number' } domain={ ['auto', 'auto'] } dataKey="timestamp"
                               tickFormatter={ (tick) => {
                                   return moment(tick).format('HH:mm:ss');
                               } }>
                            <Label value={ 'Time' } className={ 'x-label' } offset={ -16 } position="insideBottom" />
                        </XAxis>
                        <YAxis label={ {className: 'y-label', value: 'Rounds Per Minute', angle: -90, position: 'insideLeft', offset: 10} } />
                    </LineChart>
                </ResponsiveContainer>
            </HotSpotCard>
        </div>
    );
};

