import * as React from 'react';
import './devtools.scss';
import {TrackingContext} from '../../context';

// Testing-only controls, top right of the topbar. To hide them once done
// testing: flip this to `false` (fastest — no other changes needed), or
// remove the `<DevTools/>` usage from TopBar.tsx entirely.
export const DEV_TOOLS_ENABLED = true;

// Roughly matches the firmware's real cadence (~520ms: its 500ms loop delay
// plus a 20ms post-notify delay).
const SIMULATE_INTERVAL_MS = 520;

export const DevTools = (): React.ReactElement | null => {
    const {activeTracking, startTracking, recordSample, loadMockDataset} = React.useContext(TrackingContext);

    const [isSimulating, setIsSimulating] = React.useState(false);
    const [isLoadingMock, setIsLoadingMock] = React.useState(false);

    const baseRef = React.useRef(33.33);
    const intervalRef = React.useRef<ReturnType<typeof setInterval>>();

    React.useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    if (!DEV_TOOLS_ENABLED) {
        return null;
    }

    const toggleSimulate = async (): Promise<void> => {
        if (isSimulating) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            setIsSimulating(false);
            return;
        }

        if (!activeTracking) {
            await startTracking();
        }

        setIsSimulating(true);
        intervalRef.current = setInterval(() => {
            baseRef.current += (Math.random() - 0.5) * 0.05;
            baseRef.current = Math.max(32, Math.min(46, baseRef.current));
            const jitter = (Math.random() - 0.5) * 0.3;
            recordSample(Number((baseRef.current + jitter).toFixed(2)));
        }, SIMULATE_INTERVAL_MS);
    };

    const onLoadMock = async (): Promise<void> => {
        if (isLoadingMock) {
            return;
        }
        setIsLoadingMock(true);
        try {
            await loadMockDataset();
        } finally {
            setIsLoadingMock(false);
        }
    };

    return (
        <div className={"dev-tools"} title="Testing only — see DEV_TOOLS_ENABLED in DevTools.tsx">
            <button
                className={`dev-tools-button ${isSimulating ? 'active' : ''}`}
                onClick={toggleSimulate}>
                {isSimulating ? 'Stop Simulating' : 'Simulate Device'}
            </button>
            <button
                className={"dev-tools-button"}
                onClick={onLoadMock}
                disabled={isLoadingMock}>
                {isLoadingMock ? 'Loading…' : 'Load 24h Mock'}
            </button>
        </div>
    );
};
