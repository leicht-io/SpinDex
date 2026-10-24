import * as React from 'react';
import { isUsable, LinkContext, TransportState, UIContext } from '../../context';
import { Dialog } from '../Dialog';

type Platform = 'ios' | 'android' | 'linux' | 'desktop';

// How port pickers list the sensor: the ESP32-S3's USB-Serial/JTAG unit,
// whose name is fixed in the chip.
export const USB_PORT_NAME = 'USB JTAG/serial debug unit';

const detectPlatform = (): Platform => {
    const ua = navigator.userAgent;
    // iPadOS reports itself as a Mac -- tell them apart by touch support.
    if (/iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)) {
        return 'ios';
    }
    if (ua.includes('Android')) {
        return 'android';
    }
    if (/Linux|X11/.test(ua)) {
        return 'linux';
    }
    return 'desktop';
};

type Support = 'yes' | 'partial' | 'no';

interface BrowserRow {
    name: string;
    platforms: string;
    bluetooth: Support;
    usb: Support;
    note?: string;
}

// Per the Web Bluetooth CG implementation status and caniuse's Web Serial
// table. Kept to what a visitor can act on: what works, and the popular
// browsers that don't.
const BROWSERS: BrowserRow[] = [
    { name: 'Google Chrome', platforms: 'Windows 10+, macOS, ChromeOS', bluetooth: 'yes', usb: 'yes' },
    { name: 'Google Chrome', platforms: 'Linux', bluetooth: 'partial', usb: 'yes', note: 'Bluetooth behind a flag' },
    { name: 'Google Chrome', platforms: 'Android 6+', bluetooth: 'yes', usb: 'partial', note: 'USB on some newer devices only' },
    { name: 'Microsoft Edge', platforms: 'Windows, macOS', bluetooth: 'yes', usb: 'yes' },
    { name: 'Firefox', platforms: 'Windows, macOS, Linux', bluetooth: 'no', usb: 'yes', note: 'version 151 or newer' },
    { name: 'Opera', platforms: 'Windows, macOS, Linux', bluetooth: 'no', usb: 'yes' },
    { name: 'Opera, Samsung Internet', platforms: 'Android', bluetooth: 'yes', usb: 'no' },
    { name: 'Bluefy', platforms: 'iPhone, iPad', bluetooth: 'yes', usb: 'no', note: 'free app from the App Store' },
    { name: 'Safari', platforms: 'macOS, iPhone, iPad', bluetooth: 'no', usb: 'no' },
];

// ✓ / (✓) / ✕ -- a different mark per level, never color alone.
const supportMark = (support: Support): [string, string] => {
    switch (support) {
        case 'yes':
            return ['✓', 'Supported'];
        case 'partial':
            return ['(✓)', 'Partly supported'];
        case 'no':
            return ['✕', 'Not supported'];
    }
};

const SupportMark = ({ support }: { support: Support }): React.ReactElement => {
    const [mark, label] = supportMark(support);

    return (
        <span className={ `help-mark ${ support }` }
            role={ 'img' }
            aria-label={ label }>
            {mark}
        </span>
    );
};

const CopyLinkButton = (): React.ReactElement => {
    const [copied, setCopied] = React.useState(false);
    const url = `${ window.location.origin }${ window.location.pathname }`;

    return (
        <button type="button"
            className={ 'border small' }
            onClick={ () => {
                navigator.clipboard?.writeText(url)
                    .then(() => setCopied(true))
                    .catch(() => window.prompt('Copy this link', url));
            } }>
            {copied ? 'Link copied' : 'Copy link to SpinDex'}
        </button>
    );
};

const BluetoothSteps = ({ state, platform }: { state: TransportState; platform: Platform }): React.ReactElement => {
    if (isUsable(state)) {
        return (
            <ol className={ 'help-steps' }>
                <li>Power the SpinDex sensor and keep it within a few metres.</li>
                <li>Open the connection menu (top right), choose <strong>Bluetooth</strong> and pick <strong>SpinDex</strong> from the list.</li>
            </ol>
        );
    }

    // Supported browser, but the adapter is off or missing: the fix is on
    // the device, not the browser.
    if (state.supported) {
        return (
            <ol className={ 'help-steps' }>
                <li>Turn on Bluetooth in your system settings (or the quick-settings panel).</li>
                <li>Make sure the adapter supports Bluetooth Low Energy (Bluetooth 4.0 or newer).</li>
                {platform === 'linux' && <li>On Linux, check the <code>bluetooth</code> service is running and BlueZ is 5.41 or newer.</li>}
                <li>Come back here — SpinDex notices the change on its own, no reload needed — and connect.</li>
            </ol>
        );
    }

    if (platform === 'ios') {
        return (
            <ol className={ 'help-steps' }>
                <li>No browser on iPhone or iPad supports Web Bluetooth natively — install <strong>Bluefy</strong> from the App Store.</li>
                <li>Open this page in Bluefy.</li>
                <li>Allow Bluetooth when asked, then connect.</li>
            </ol>
        );
    }
    if (platform === 'linux') {
        return (
            <ol className={ 'help-steps' }>
                <li>Open this page in Google Chrome or Chromium.</li>
                <li>Go to <code>chrome://flags/#enable-experimental-web-platform-features</code>, set it to <em>Enabled</em> and relaunch.</li>
                <li>Make sure BlueZ is 5.41 or newer and Bluetooth is on, then connect.</li>
            </ol>
        );
    }
    return (
        <ol className={ 'help-steps' }>
            <li>Open this page in {platform === 'android' ? 'Chrome or Samsung Internet' : 'Google Chrome or Microsoft Edge'}.</li>
            <li>Turn on Bluetooth and power the SpinDex sensor.</li>
            <li>Choose <strong>Bluetooth</strong> in the connection menu and pick <strong>SpinDex</strong> from the list.</li>
        </ol>
    );
};

const UsbSteps = ({ state, platform }: { state: TransportState; platform: Platform }): React.ReactElement => {
    if (!isUsable(state)) {
        if (platform === 'ios') {
            return <p>iPhone and iPad browsers can&apos;t talk to USB devices — connect over Bluetooth instead.</p>;
        }
        if (platform === 'android') {
            return <p>This browser can&apos;t talk to USB serial devices. Chrome can on some newer Android devices; otherwise connect over Bluetooth.</p>;
        }
        return <p>This browser can&apos;t talk to USB serial devices. Open this page in Google Chrome, Microsoft Edge, Opera, or Firefox 151 or newer.</p>;
    }

    return (
        <>
            <ol className={ 'help-steps' }>
                <li>
                    Plug the SpinDex into this {platform === 'android' ? 'phone' : 'computer'} with a USB-C cable
                    that carries data — some charging-only cables don&apos;t.
                </li>
                {navigator.userAgent.includes('Firefox/') && (
                    <li>Firefox first asks to add a site permission add-on for serial ports — allow it.</li>
                )}
                <li>Open the connection menu (top right), choose <strong>USB cable</strong> and pick the sensor — it&apos;s listed as <em>{USB_PORT_NAME}</em>.</li>
                {platform === 'linux' ? (
                    <>
                        <li>
                            If the port won&apos;t open, add yourself to the <code>dialout</code> group, then log out and back in:
                            <code className={ 'help-command' }>sudo usermod -aG dialout $USER</code>
                        </li>
                        <li>
                            If it connects and drops straight away, a serial tool (PlatformIO, esptool, a serial monitor) left
                            the port in a mode this version of Chrome can&apos;t read. Reset it, then connect again:
                            <code className={ 'help-command' }>stty -F /dev/ttyACM0 min 1</code>
                        </li>
                    </>
                ) : state.problem === 'lostWhilePlugged' && (
                    <li>If it connects and drops straight away, unplug the sensor, plug it back in and connect again.</li>
                )}
            </ol>
            <p className={ 'help-note' }>
                If the cable is pulled during a session, SpinDex reconnects by itself when it&apos;s plugged back in,
                and reloading the page during a recording picks the sensor back up. Otherwise it leaves the port alone,
                so it doesn&apos;t get in the way of flashing or a serial monitor. If the status bar shows
                {' '}<em>no data</em> or <em>no readings arrived</em>, the sensor&apos;s firmware is older than USB
                support and needs updating: choose <strong>Update sensor firmware…</strong> in the connection menu.
            </p>
        </>
    );
};

export const ConnectionHelpDialog = (): React.ReactElement => {
    const { bluetooth, usb, canConnect } = React.useContext(LinkContext);
    const { closeDialog } = React.useContext(UIContext);
    const platform = detectPlatform();

    const bluetoothSection = (
        <div className={ 'help-section' }>
            <h3 className={ 'help-heading' }>Bluetooth</h3>
            <BluetoothSteps state={ bluetooth }
                platform={ platform } />
        </div>
    );
    const usbSection = (
        <div className={ 'help-section' }>
            <h3 className={ 'help-heading' }>USB cable</h3>
            <UsbSteps state={ usb }
                platform={ platform } />
        </div>
    );
    // Whichever works here comes first -- or USB, when that's what the
    // status bar's "Read more" for a USB problem led here for.
    const usbFirst = usb.problem !== null || (isUsable(usb) && !isUsable(bluetooth));

    return (
        <Dialog title={ canConnect ? 'Connecting to SpinDex' : (bluetooth.supported ? 'Bluetooth is turned off' : 'This browser can’t connect') }
            eyebrow={ 'Connection help' }
            wide={ true }
            onClose={ closeDialog }>
            <p>
                SpinDex talks to the sensor straight from the browser, over Bluetooth or a USB cable.
                {!canConnect && ' Neither works in this browser right now. Everything already saved here can still be browsed and compared — only recording needs a connection.'}
            </p>

            {usbFirst ? usbSection : bluetoothSection}
            {usbFirst ? bluetoothSection : usbSection}

            <div className={ 'help-section' }>
                <h3 className={ 'help-heading' }>Supported browsers</h3>
                <table className={ 'help-browsers' }>
                    <thead>
                        <tr>
                            <th scope={ 'col' }>Browser</th>
                            <th scope={ 'col' }>Bluetooth</th>
                            <th scope={ 'col' }>USB</th>
                        </tr>
                    </thead>
                    <tbody>
                        {BROWSERS.map(browser => (
                            <tr key={ `${ browser.name } ${ browser.platforms }` }
                                className={ browser.bluetooth === 'no' && browser.usb === 'no' ? 'unsupported' : '' }>
                                <th scope={ 'row' }>
                                    <span className={ 'help-browser-name' }>
                                        {browser.name}
                                        {browser.note && <small> — {browser.note}</small>}
                                    </span>
                                    <span className={ 'help-browser-platforms' }>{browser.platforms}</span>
                                </th>
                                <td><SupportMark support={ browser.bluetooth } /></td>
                                <td><SupportMark support={ browser.usb } /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className={ 'help-note' }>
                    Measurements are stored per browser, so runs saved here won&apos;t appear in another browser
                    — export them as CSV first if you need a copy.
                </p>
                <CopyLinkButton />
            </div>
        </Dialog>
    );
};
