import * as React from 'react';
import { BLEContext, UIContext } from '../../context';
import { Dialog } from '../Dialog';

type Platform = 'ios' | 'android' | 'linux' | 'desktop';

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

interface BrowserRow {
    name: string;
    platforms: string;
    supported: boolean;
    note?: string;
}

// Per the Web Bluetooth CG implementation status. Kept to what a visitor
// can act on: what works, and the two popular browsers that don't.
const BROWSERS: BrowserRow[] = [
    { name: 'Google Chrome', platforms: 'Windows 10+, macOS, ChromeOS, Android 6+', supported: true },
    { name: 'Microsoft Edge', platforms: 'Windows, macOS', supported: true },
    { name: 'Samsung Internet', platforms: 'Android', supported: true },
    { name: 'Opera', platforms: 'Android', supported: true, note: 'not the desktop version' },
    { name: 'Chrome on Linux', platforms: 'Linux', supported: true, note: 'behind a flag, see below' },
    { name: 'Bluefy', platforms: 'iPhone, iPad', supported: true, note: 'free app from the App Store' },
    { name: 'Safari', platforms: 'macOS, iPhone, iPad', supported: false },
    { name: 'Firefox', platforms: 'All platforms', supported: false },
];

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

export const BluetoothHelpDialog = (): React.ReactElement => {
    const { supported, available } = React.useContext(BLEContext);
    const { closeDialog } = React.useContext(UIContext);
    const platform = detectPlatform();

    // Supported browser, but the adapter is off or missing: the fix is on
    // the device, not the browser.
    if (supported && available === false) {
        return (
            <Dialog title={ 'Bluetooth is turned off' }
                eyebrow={ 'Connection help' }
                onClose={ closeDialog }>
                <p>Your browser supports Web Bluetooth, but it can&apos;t find a Bluetooth adapter that&apos;s switched on.</p>
                <ol className={ 'help-steps' }>
                    <li>Turn on Bluetooth in your system settings (or the quick-settings panel).</li>
                    <li>Make sure the adapter supports Bluetooth Low Energy (Bluetooth 4.0 or newer).</li>
                    {platform === 'linux' && <li>On Linux, check the <code>bluetooth</code> service is running and BlueZ is 5.41 or newer.</li>}
                    <li>Come back here — SpinDex notices the change on its own, no reload needed — and press Connect.</li>
                </ol>
            </Dialog>
        );
    }

    return (
        <Dialog title={ 'Web Bluetooth isn’t available' }
            eyebrow={ 'Connection help' }
            wide={ true }
            onClose={ closeDialog }>
            <p>
                SpinDex talks to the sensor straight from the browser using Web Bluetooth, which this browser
                doesn&apos;t provide. Everything already saved here can still be browsed and compared — only
                recording needs it.
            </p>

            <div className={ 'help-section' }>
                <h3 className={ 'help-heading' }>Supported browsers</h3>
                <ul className={ 'help-browsers' }>
                    {BROWSERS.map(browser => (
                        <li key={ browser.name }
                            className={ browser.supported ? '' : 'unsupported' }>
                            <span className={ 'help-browser-mark' }
                                aria-label={ browser.supported ? 'Supported' : 'Not supported' }>
                                {browser.supported ? '✓' : '✕'}
                            </span>
                            <span className={ 'help-browser-name' }>
                                {browser.name}
                                {browser.note && <small> — {browser.note}</small>}
                            </span>
                            <span className={ 'help-browser-platforms' }>{browser.platforms}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className={ 'help-section' }>
                <h3 className={ 'help-heading' }>How to continue</h3>
                {platform === 'ios' ? (
                    <ol className={ 'help-steps' }>
                        <li>No browser on iPhone or iPad supports Web Bluetooth natively — install <strong>Bluefy</strong> from the App Store.</li>
                        <li>Open this page in Bluefy.</li>
                        <li>Allow Bluetooth when asked, then press Connect.</li>
                    </ol>
                ) : platform === 'linux' ? (
                    <ol className={ 'help-steps' }>
                        <li>Open this page in Google Chrome or Chromium.</li>
                        <li>Go to <code>chrome://flags/#enable-experimental-web-platform-features</code>, set it to <em>Enabled</em> and relaunch.</li>
                        <li>Make sure BlueZ is 5.41 or newer and Bluetooth is on, then press Connect.</li>
                    </ol>
                ) : (
                    <ol className={ 'help-steps' }>
                        <li>Open this page in {platform === 'android' ? 'Chrome or Samsung Internet' : 'Google Chrome or Microsoft Edge'}.</li>
                        <li>Turn on Bluetooth and switch on the SpinDex sensor.</li>
                        <li>Press Connect and pick <strong>SpinDex</strong> from the list.</li>
                    </ol>
                )}
                <p className={ 'help-note' }>
                    Measurements are stored per browser, so runs saved here won&apos;t appear in the other browser
                    — export them as CSV first if you need a copy.
                </p>
                <CopyLinkButton />
            </div>
        </Dialog>
    );
};
