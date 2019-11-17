import * as React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Divider } from '../../components/Divider';
import { HotSpotCard } from '../../components/HotSpotCard';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const Dashboard = () => {
    const [currentRPM, setCurrentRPM] = React.useState<number>(0.00);
    const [currentData, setCurrentData] = React.useState<any>();

    webSocket.onopen = () => {
        console.log("socket open!")
    }

    webSocket.onmessage = (event) => {
        const value = Number(JSON.parse(event.data).value);
        console.log(JSON.parse(event.data).value)
        setCurrentRPM(value);
    };

    /*React.useEffect(() => {
        // TODO: Use socket instead
        const interval = setInterval(() => {
            // TODO: Use socket instead
            fetch('http://localhost:3000/rpm/all')
                .then((response) => response.json())
                .then((values) => {
                    const tempData = [];
                    for (let i = 0; i < values.length; i++) {
                        tempData.push({
                            name: values[i].timestamp,
                            uv: values[i].value,
                        });
                    }
                    setCurrentData(tempData);
                });
        }, 1500);
        return () => clearInterval(interval);
    }, []);*/

    return (
        <div>
            <HotSpotCard title="RPM" value={ currentRPM.toFixed(2) } />

            <Divider />

            <HotSpotCard>
                <ResponsiveContainer height={ 300 } width="100%">
                    <LineChart data={ currentData }>
                        <Line type="monotone" dataKey="uv" stroke="#8884d8" />
                        <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                        <XAxis dataKey="name" />
                        <YAxis />
                    </LineChart>
                </ResponsiveContainer>
            </HotSpotCard>
        </div>
    );
};
