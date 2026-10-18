import * as React from 'react';
import './statusbar.scss';
import { BLEContext, TrackingContext, UIContext } from '../../context';
import { formatElapsed } from '../../core/tracking/stats';
import { APP_VERSION } from '../../core/changelog';

const pad = (n: number): string => String(n).padStart(2, '0');

const useClock = (): Date => {
    const [now, setNow] = React.useState(() => new Date());
    React.useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
};

type LinkState = 'connected' | 'searching' | 'idle' | 'unusable';

/**
 * IDE-style status strip along the bottom: Bluetooth link on the left
 * (with a "read more" when the browser or adapter can't do Bluetooth),
 * the live recording readout in the middle, library totals, the version
 * (opens the changelog) and a clock on the right.
 */
export const StatusBar = (): React.ReactElement => {
    const { connected, supported, available, status } = React.useContext(BLEContext);
    const { trackings, folders, activeTracking, latestValue } = React.useContext(TrackingContext);
    const { openDialog } = React.useContext(UIContext);
    const now = useClock();

    const unusable = !supported || available === false;
    const searching = !connected && !unusable && status !== '' && !status.startsWith('Error');
    const link: LinkState = connected ? 'connected' : unusable ? 'unusable' : searching ? 'searching' : 'idle';

    const linkLabel = {
        connected: 'Link · connected',
        searching: 'Link · searching',
        idle: 'Link · offline',
        unusable: supported ? 'Bluetooth off' : 'No Web Bluetooth',
    }[link];

    return (
        <footer className={ 'statusbar' }
            aria-label={ 'Status' }>
            <div className={ 'statusbar-group' }>
                <span className={ `statusbar-led ${ link }` } />
                <span>{linkLabel}</span>
                {unusable && (
                    <button className={ 'statusbar-link' }
                        onClick={ () => openDialog({ kind: 'bluetoothHelp' }) }>
                        Read more
                    </button>
                )}
                {!unusable && status && !connected && (
                    <span className={ 'statusbar-detail' }>{status}</span>
                )}
            </div>

            {activeTracking && (
                <div className={ `statusbar-group statusbar-rec ${ connected ? '' : 'paused' }` }>
                    <span className={ 'statusbar-rec-dot' } />
                    <span>{connected ? 'Rec' : 'Paused'}</span>
                    <span className={ 'statusbar-value' }>{formatElapsed(now.getTime() - activeTracking.startedAt)}</span>
                    {connected && <span className={ 'statusbar-value' }>{latestValue.toFixed(2)} rpm</span>}
                    <span className={ 'statusbar-detail' }>{activeTracking.sampleCount.toLocaleString()} samples</span>
                </div>
            )}

            <div className={ 'statusbar-group statusbar-right' }>
                <span className={ 'statusbar-detail' }>
                    {trackings.length} run{trackings.length === 1 ? '' : 's'} · {folders.length} turntable{folders.length === 1 ? '' : 's'}
                </span>
                <button className={ 'statusbar-version' }
                    onClick={ () => openDialog({ kind: 'changelog' }) }
                    title={ 'What\u2019s new' }>
                    v{APP_VERSION}
                </button>
                <span className={ 'statusbar-value' }>{pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}</span>
            </div>
        </footer>
    );
};
