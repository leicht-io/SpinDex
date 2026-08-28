import * as React from 'react';
import "./topbar.scss"
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';
import {BLEContext} from "../../context";

export const TopBar = (): React.ReactElement => {
    const {initBluetooth, status, connected} = React.useContext(BLEContext);

    // The BLE status is a loose set of human-readable sentences (see
    // BLEContext), not an enum, so this is a best-effort read of "an attempt
    // is in flight" purely to drive the button's pulse animation.
    const isSearching = !connected && status !== ''
        && !status.startsWith('Error') && !status.includes('not available');

    return (
        <header className={"topbar"}>
            <nav>
                <svg className={"topbar-mark"} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                    <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                    <circle cx="12" cy="12" r="1.75" fill="currentColor"/>
                </svg>
                <h5 className="max">SpinDex</h5>

                <span className={`status-dot ${connected ? 'connected' : ''}`} aria-hidden="true"/>
                <p className={"status-text"}>{status || "Not Connected"}</p>
                <button
                    onClick={() => {
                        initBluetooth();
                    }}
                    aria-label={connected ? "Connected" : "Connect to SpinDex"}
                    className={`circle small ${connected ? '' : 'primary'} ${isSearching ? 'searching' : ''}`}>
                    <BluetoothSearchingIcon fontSize={"small"}/>
                </button>
            </nav>
        </header>
    );
};
