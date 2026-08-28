import * as React from "react";
import "./footer.scss"
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';
import {BLEContext} from "../../context";

export const Footer = () => {
    const {initBluetooth, status, connected} = React.useContext(BLEContext);

    // The BLE status is a loose set of human-readable sentences (see
    // BLEContext), not an enum, so this is a best-effort read of "an attempt
    // is in flight" purely to drive the button's pulse animation.
    const isSearching = !connected && status !== ''
        && !status.startsWith('Error') && !status.includes('not available');

    return (
        <footer className={"footer"}>
            <nav>
                <span className={`status-dot ${connected ? 'connected' : ''}`} aria-hidden="true"/>
                <p className={"max status-text"}>{status || "Not Connected"}</p>
                <button
                    onClick={() => {
                        initBluetooth();
                    }}
                    aria-label={connected ? "Connected" : "Connect to SpinDex"}
                    className={`circle extra ${connected ? '' : 'primary'} ${isSearching ? 'searching' : ''}`}>
                    <BluetoothSearchingIcon/>
                </button>
            </nav>
        </footer>
    );
}
