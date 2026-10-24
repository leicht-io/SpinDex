import * as React from 'react';
import './connectbuttons.scss';
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';
import UsbIcon from '@mui/icons-material/Usb';
import { isUsable, LinkContext } from '../../context';

interface ConnectButtonsProps {
    // Extra classes for each button, e.g. 'small' or 'border'.
    className?: string;
}

/**
 * One button per way of connecting this browser can use. Renders nothing
 * when it can use neither -- callers point to the connection help instead.
 */
export const ConnectButtons = ({ className = '' }: ConnectButtonsProps): React.ReactElement => {
    const { bluetooth, usb, connect } = React.useContext(LinkContext);

    return (
        <span className={ 'connect-buttons' }>
            {isUsable(bluetooth) && (
                <button type="button"
                    className={ className }
                    onClick={ () => connect('bluetooth') }>
                    <BluetoothSearchingIcon fontSize={ 'small' } /> Bluetooth
                </button>
            )}
            {isUsable(usb) && (
                <button type="button"
                    className={ className }
                    onClick={ () => connect('usb') }>
                    <UsbIcon fontSize={ 'small' } /> USB
                </button>
            )}
        </span>
    );
};
