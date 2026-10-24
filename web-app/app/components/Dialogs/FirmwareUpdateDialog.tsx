import * as React from 'react';
import { LinkContext, TrackingContext, UIContext } from '../../context';
import { APP_VERSION, CHANGELOG } from '../../core/changelog';
import { errorMessage } from '../../core/errorMessage';
import { FirmwareBundle, FirmwareRelease, loadFirmwareBundleOnce, loadFirmwareIndexOnce } from '../../core/firmware/firmwareBundle';
import { firmwareStatus } from '../../core/firmware/firmwareStatus';
import { FirmwareFlashError, FlashStage, preloadFlasher } from '../../core/firmware/flashFirmware';
import { Dialog, Field } from '../Dialog';
import { Select } from '../Menu';
import { USB_PORT_NAME } from './ConnectionHelpDialog';

type Step =
    | { kind: 'ready' }
    // Update pressed; `picking`: the browser's port picker is open.
    | { kind: 'starting'; picking: boolean }
    | { kind: 'flashing'; stage: FlashStage; progress: number }
    | { kind: 'done'; version: string }
    | { kind: 'failed'; message: string; log: string };

// A download in progress (null), done, or failed.
type Loaded<T> = { value: T } | { error: string } | null;

const STAGE_LABEL: Record<FlashStage, string> = {
    connecting: 'Starting the sensor’s bootloader…',
    writing: 'Writing the firmware…',
    restarting: 'Restarting the sensor…',
};

// Runs `load` while `active`, into a Loaded state; a newer key's load
// replaces an older one's.
const useLoaded = <T, >(active: boolean, key: string | null, load: () => Promise<T>): Loaded<T> => {
    const [loaded, setLoaded] = React.useState<Loaded<T>>(null);
    React.useEffect(() => {
        if (!active || key === null) {
            return;
        }
        let cancelled = false;
        setLoaded(null);
        load()
            .then((value) => {
                if (!cancelled) {
                    setLoaded({ value });
                }
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    setLoaded({ error: errorMessage(error) });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [active, key]);
    return loaded;
};

/**
 * Flashes sensor firmware over USB: by default the version for this app
 * (the sensor's firmware version follows the app's), or an older release
 * to downgrade. The versions on offer are the ones this build bundles (see
 * core/firmware).
 */
export const FirmwareUpdateDialog = (): React.ReactElement => {
    const { transport, connected, receiving, noData, firmwareVersion, usb, updateFirmware } = React.useContext(LinkContext);
    const { activeTracking } = React.useContext(TrackingContext);
    const { openDialog, closeDialog } = React.useContext(UIContext);

    const [step, setStep] = React.useState<Step>({ kind: 'ready' });
    const [chosen, setChosen] = React.useState<string | null>(null);

    const blocker = !usb.supported
        ? 'Updating needs a USB cable and a browser that can use it: Chrome, Edge or Opera on a computer, or Firefox 151 or newer.'
        : activeTracking
            ? 'Stop the recording first: the sensor can’t measure while it’s being updated.'
            : null;

    // Fetched up front, so pressing Update opens the port picker straight
    // away -- it has to happen inside that click -- and the flasher is ready
    // by the time it's needed. Not when an update can't happen anyway.
    React.useEffect(() => {
        if (!blocker) {
            preloadFlasher();
        }
    }, [blocker]);
    const index = useLoaded<FirmwareRelease[]>(!blocker, 'index', () => loadFirmwareIndexOnce(document.baseURI));
    const releases = index && 'value' in index ? index.value : [];
    // This app's version unless another was picked (or this one isn't
    // offered).
    const selected = releases.find(release => release.version === chosen)
        ?? releases.find(release => release.version === APP_VERSION)
        ?? releases[0];
    const download = useLoaded<FirmwareBundle>(!blocker, selected?.version ?? null, () => loadFirmwareBundleOnce(selected?.version ?? '', document.baseURI));
    const bundle = download && 'value' in download ? download.value : null;
    const loadError = (index && 'error' in index ? index.error : null) ?? (download && 'error' in download ? download.error : null);

    // Over USB, a silent sensor runs firmware from before USB support.
    const status = firmwareStatus(firmwareVersion, receiving || (noData && transport === 'usb'), APP_VERSION);
    // The link skips the picker for a sensor attached over USB that has
    // identified itself (see lendPort).
    const attached = transport === 'usb' && connected && (firmwareVersion !== null || receiving);

    const start = (): void => {
        if (!bundle || !selected) {
            return;
        }
        const { version } = selected;
        setStep({ kind: 'starting', picking: !attached });
        updateFirmware(bundle, {
            onStage: stage => setStep({ kind: 'flashing', stage, progress: 0 }),
            onProgress: progress => setStep(prev => (prev.kind === 'flashing' ? { ...prev, progress } : prev)),
        })
            .then((started: boolean) => setStep(started ? { kind: 'done', version } : { kind: 'ready' }))
            .catch((error: unknown) => setStep({
                kind: 'failed',
                message: errorMessage(error),
                log: error instanceof FirmwareFlashError ? error.log : '',
            }));
    };

    const idle = step.kind === 'ready' || step.kind === 'failed';
    const notes = selected && CHANGELOG.find(entry => entry.version === selected.version);

    return (
        <Dialog title={ 'Update sensor firmware' }
            eyebrow={ 'Firmware' }
            onClose={ closeDialog }
            closeDisabled={ step.kind === 'starting' || step.kind === 'flashing' }
            onSubmit={ idle ? start : undefined }
            submitLabel={ step.kind === 'failed' ? 'Try again' : (selected && firmwareVersion === selected.version ? 'Reinstall' : 'Install') }
            submitDisabled={ !bundle || blocker !== null }>
            <p>
                Installs sensor firmware over a USB cable. Firmware <strong>{APP_VERSION}</strong> is the one for this
                version of SpinDex{releases.length > 1 && '; pick another to downgrade'}.
                {status === 'current' && ` The sensor runs ${ APP_VERSION } already.`}
                {status === 'other' && ` The sensor runs ${ firmwareVersion ?? '' } now.`}
                {status === 'unreported' && ' The sensor doesn’t report its version, so its firmware is probably from before SpinDex 2.3.0.'}
            </p>

            {loadError && <p className={ 'dialog-note dialog-note-warning' }>{loadError}</p>}
            {blocker && <p className={ 'dialog-note dialog-note-warning' }>{blocker}</p>}

            {releases.length > 0 && selected && !blocker && (
                <Field label={ 'Version' }
                    hint={ [selected.date, notes?.title].filter(Boolean).join(' · ') }>
                    <Select value={ selected.version }
                        ariaLabel={ 'Firmware version' }
                        onChange={ setChosen }
                        options={ releases.map(release => ({
                            value: release.version,
                            label: release.version,
                            hint: [
                                release.version === APP_VERSION && 'for this app',
                                release.version === firmwareVersion && 'installed',
                                release.local && 'local build',
                            ].filter(Boolean).join(', ') || undefined,
                        })) } />
                </Field>
            )}
            {selected && selected.version !== APP_VERSION && !blocker && idle && (
                <p className={ 'dialog-note' }>
                    This isn&apos;t the firmware for this version of SpinDex. Older firmware may lack things the app
                    expects, and the status bar will keep offering {APP_VERSION}.
                    {selected.url && <> <a href={ selected.url }
                        target={ '_blank' }
                        rel={ 'noreferrer' }>Release notes</a></>}
                </p>
            )}

            {step.kind === 'ready' && !blocker && (
                <ol className={ 'help-steps' }>
                    <li>Plug the SpinDex into this computer with a USB-C cable that carries data.</li>
                    <li>
                        Choose <strong>Install</strong>
                        {attached ? '.' : <>, then pick the sensor: it&apos;s listed as <em>{USB_PORT_NAME}</em>.</>}
                    </li>
                    <li>Keep it plugged in until it&apos;s done, which takes under a minute. The sensor then restarts into the new firmware.</li>
                </ol>
            )}

            {step.kind === 'starting' && (
                <p>{step.picking ? `Pick the sensor in the browser’s list: it’s listed as ${ USB_PORT_NAME }.` : 'Starting…'}</p>
            )}

            {step.kind === 'flashing' && (
                <div className={ 'firmware-progress' }>
                    <span>
                        {STAGE_LABEL[step.stage]}
                        {step.stage === 'writing' && ` ${ Math.round(step.progress * 100) }%`}
                    </span>
                    <progress value={ step.stage === 'writing' ? step.progress : undefined }
                        max={ 1 } />
                    <span className={ 'help-note' }>Don&apos;t unplug the sensor or close this page.</span>
                </div>
            )}

            {step.kind === 'done' && (
                <p className={ 'dialog-note' }>
                    {firmwareVersion === step.version
                        ? `Done: the sensor runs firmware ${ step.version }.`
                        : `Firmware ${ step.version } is installed, and the sensor is restarting.`}
                </p>
            )}

            {step.kind === 'failed' && (
                <>
                    <p className={ 'dialog-note dialog-note-warning' }>The update failed: {step.message}</p>
                    <p className={ 'help-note' }>
                        The chip&apos;s own bootloader can&apos;t be overwritten, so you can always try again. If the sensor
                        doesn&apos;t respond, unplug it, hold the button on the StampS3 while plugging it back in, and update again.
                        {' '}
                        <button type="button"
                            className={ 'dialog-inline-link' }
                            onClick={ () => openDialog({ kind: 'connectionHelp' }) }>
                            Connection help
                        </button>
                    </p>
                    {step.log && (
                        <details className={ 'firmware-log' }>
                            <summary>Details</summary>
                            <pre>{step.log}</pre>
                        </details>
                    )}
                </>
            )}
        </Dialog>
    );
};
