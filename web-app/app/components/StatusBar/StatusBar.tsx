import * as React from 'react';
import './statusbar.scss';
import { LinkContext, TrackingContext, transportLabel, UIContext } from '../../context';
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

type LinkState = 'connected' | 'nodata' | 'searching' | 'idle' | 'unusable';

/**
 * IDE-style status strip along the bottom: the link (Bluetooth or USB) on
 * the left (with a "read more" when the browser can't connect either way),
 * the live recording readout in the middle, library totals, the version
 * (opens the changelog) and a clock on the right.
 */
export const StatusBar = (): React.ReactElement => {
    const { transport, connected, connecting, noData, receiving, status, problem, canConnect, bluetooth } = React.useContext(LinkContext);
    const { trackings, folders, activeTracking, latestValue } = React.useContext(TrackingContext);
    const { openDialog } = React.useContext(UIContext);
    const now = useClock();

    // noData implies connected.
    const link: LinkState = noData ? 'nodata' : connected ? 'connected' : !canConnect ? 'unusable' : connecting ? 'searching' : 'idle';
    const via = transport ? transportLabel(transport) : 'Link';

    const linkLabel = {
        connected: `${ via } · connected`,
        nodata: `${ via } · no data`,
        searching: `${ via } · searching`,
        idle: `${ via } · offline`,
        unusable: bluetooth.supported ? 'Bluetooth off' : 'No Bluetooth or USB',
    }[link];

    return (
        <footer className={ 'statusbar' }
            aria-label={ 'Status' }>
            <div className={ 'statusbar-group' }>
                <span className={ `statusbar-led ${ link }` } />
                <span>{linkLabel}</span>
                {(!canConnect || noData || problem) && (
                    <button className={ 'statusbar-link' }
                        onClick={ () => openDialog({ kind: 'connectionHelp' }) }>
                        Read more
                    </button>
                )}
                {canConnect && status && !connected && (
                    <span className={ 'statusbar-detail' }
                        title={ status }>{status}</span>
                )}
                {noData && (
                    <span className={ 'statusbar-detail' }>
                        {transport === 'usb' ? 'No readings — the sensor may need a firmware update' : 'No readings from the sensor'}
                    </span>
                )}
            </div>

            {activeTracking && (
                <div className={ `statusbar-group statusbar-rec ${ connected ? '' : 'paused' }` }>
                    <span className={ 'statusbar-rec-dot' } />
                    <span>{connected ? 'Rec' : 'Paused'}</span>
                    <span className={ 'statusbar-value' }>{formatElapsed(now.getTime() - activeTracking.startedAt)}</span>
                    {/* Until a fresh reading arrives latestValue is stale (or 0
                        after a reload), which would read as a stopped platter. */}
                    {receiving && <span className={ 'statusbar-value' }>{latestValue.toFixed(2)} rpm</span>}
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
