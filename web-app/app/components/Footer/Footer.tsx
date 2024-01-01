import * as React from "react";
import "./footer.scss"
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';
// import RestartAltIcon from '@mui/icons-material/RestartAlt';
// import StopIcon from '@mui/icons-material/Stop';
import {BLEContext} from "../../context";

export const Footer = () => {
    const {initBluetooth, status} = React.useContext(BLEContext);

    return (
        <footer className={"footer"}>
            <nav>
                {/* <button className="circle transparent">
                    <RestartAltIcon/>
                </button>
                <button className="circle transparent">
                    <StopIcon color={"secondary"}/>
                </button> */ }
                <div className="max"></div>

                    <p>{status || "Not Connected"}</p>
                <button
                    onClick={() => {
                        initBluetooth();
                    }}
                    className="square round extra primary">
                    <BluetoothSearchingIcon/>
                </button>
            </nav>
        </footer>
    );
}