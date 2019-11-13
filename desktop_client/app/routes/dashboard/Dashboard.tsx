import { Pane } from 'evergreen-ui';
import * as React from 'react';
import { HotSpotCard } from '../../components/HotSpotCard';

const webSocket: WebSocket = new WebSocket('ws://localhost:3000');

export const Dashboard = () => {
    const [currentRPM, setCurrentRPM] = React.useState<number>(0.00);
    const [currentData, setCurrentData] = React.useState<any>();

    webSocket.onmessage = (event) => {
        console.log('got', JSON.parse(event.data));
        setCurrentRPM(JSON.parse(event.data).value);
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
        <Pane clearfix={ true }>
            <Pane
                elevation={ 2 }
                float="left"
                width={ 200 }
                height={ 120 }
                margin={ 24 }
                display="flex"
                justifyContent="center"
                alignItems="center"
                flexDirection="column">
                <HotSpotCard title="RPM" value={ currentRPM.toFixed(2) } />
                { /*<HotSpotCard title="Temperature" value="30 C"/>
                        <HotSpotCard title="Current" value="2.1 A"/>
                        <HotSpotCard title="Voltage" value="12 V"/>*/}
            </Pane>
        </Pane>);

    {
        /*<Paper className={ classes.graph }>
                    <ResponsiveContainer height={ 300 } width="100%">
                        <LineChart data={ currentData }>
                            <Line type="monotone" dataKey="uv" stroke="#8884d8" />
                            <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                            <XAxis dataKey="name" />
                            <YAxis />
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>*/
    }
};
