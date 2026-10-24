import * as React from 'react';
import { LinkContext, TrackingContext, UIContext } from '../../context';
import { ConnectButtons } from '../ConnectButtons';
import { Dialog, Field } from '../Dialog';
import { Select } from '../Menu';
import { findFolder, folderLabel } from '../../core/tracking/folders';

const NEW_FOLDER = '__new__';
const NO_FOLDER = '';

interface NewMeasurementDialogProps {
    folderId?: string | null;
}

export const NewMeasurementDialog = ({ folderId }: NewMeasurementDialogProps): React.ReactElement => {
    const { connected, noData, canConnect, bluetooth } = React.useContext(LinkContext);
    const { folders, activeTracking, viewingTracking, startTracking, stopTracking, createFolder } = React.useContext(TrackingContext);
    const { closeDialog, setViewMode, openDialog } = React.useContext(UIContext);

    // Default to the folder asked for, else the one the user is currently
    // looking at -- re-measuring the same turntable is the common case.
    const initialFolder = folderId !== undefined
        ? (folderId ?? NO_FOLDER)
        : (viewingTracking?.folderId ?? folders[0]?.id ?? NEW_FOLDER);

    const [name, setName] = React.useState('');
    const [folderChoice, setFolderChoice] = React.useState<string>(initialFolder);
    const [model, setModel] = React.useState('');
    const [serial, setSerial] = React.useState('');
    const [busy, setBusy] = React.useState(false);

    const isNewFolder = folderChoice === NEW_FOLDER;
    const existingMatch = isNewFolder && model.trim() ? findFolder(folders, model, serial) : undefined;
    const modelSuggestions = Array.from(new Set(folders.map(f => f.name)));
    // Not while the link is up but silent: the run would record nothing.
    const canSubmit = connected && !noData && !busy && (!isNewFolder || model.trim() !== '');

    const onSubmit = async (): Promise<void> => {
        setBusy(true);
        try {
            let targetFolderId: string | null = folderChoice === NO_FOLDER ? null : folderChoice;
            if (isNewFolder) {
                targetFolderId = (existingMatch ?? await createFolder(model.trim(), serial.trim())).id;
            }
            if (activeTracking) {
                await stopTracking();
            }
            await startTracking(name.trim() || undefined, targetFolderId);
            setViewMode('measurement');
            closeDialog();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog title={ 'New measurement' }
            eyebrow={ 'Record' }
            onClose={ closeDialog }
            onSubmit={ onSubmit }
            submitLabel={ 'Start recording' }
            submitDisabled={ !canSubmit }>
            <Field label={ 'Turntable' }>
                <Select value={ folderChoice }
                    onChange={ setFolderChoice }
                    options={ [
                        ...folders.map(folder => ({ value: folder.id, label: folderLabel(folder) })),
                        { value: NO_FOLDER, label: 'No folder', divider: true },
                        { value: NEW_FOLDER, label: '+ New turntable…', action: true },
                    ] } />
            </Field>

            {isNewFolder && (
                <div className={ 'app-field-row' }>
                    <Field label={ 'Model' }>
                        <input className={ 'app-input' }
                            list={ 'turntable-models' }
                            placeholder={ 'Beogram 4002' }
                            value={ model }
                            autoFocus={ true }
                            onChange={ (e) => setModel(e.target.value) } />
                    </Field>
                    <Field label={ 'Serial number' }>
                        <input className={ 'app-input' }
                            placeholder={ 'Optional' }
                            value={ serial }
                            onChange={ (e) => setSerial(e.target.value) } />
                    </Field>
                    <datalist id={ 'turntable-models' }>
                        {modelSuggestions.map(m => <option key={ m }
                            value={ m } />)}
                    </datalist>
                </div>
            )}
            {existingMatch && (
                <p>Will be filed with the existing <strong>{folderLabel(existingMatch)}</strong> folder.</p>
            )}

            <Field label={ 'Name' }>
                <input className={ 'app-input' }
                    placeholder={ `Measurement — ${ new Date().toLocaleString() }` }
                    value={ name }
                    autoFocus={ !isNewFolder }
                    onChange={ (e) => setName(e.target.value) } />
            </Field>

            {activeTracking && (
                <p className={ 'dialog-note' }>&quot;{activeTracking.name}&quot; is still recording and will be stopped.</p>
            )}

            {!connected && (canConnect ? (
                <div className={ 'dialog-note dialog-note-warning' }>
                    <span>Connect the SpinDex sensor to start recording.</span>
                    <ConnectButtons className={ 'small' } />
                </div>
            ) : (
                <div className={ 'dialog-note dialog-note-warning' }>
                    <span>{bluetooth.supported ? 'Bluetooth is turned off.' : 'This browser can’t connect to the sensor.'}</span>
                    <button type="button"
                        className={ 'small border' }
                        onClick={ () => openDialog({ kind: 'connectionHelp' }) }>
                        Read more
                    </button>
                </div>
            ))}

            {noData && (
                <div className={ 'dialog-note dialog-note-warning' }>
                    <span>The sensor is connected but sends no readings.</span>
                    <button type="button"
                        className={ 'small border' }
                        onClick={ () => openDialog({ kind: 'connectionHelp' }) }>
                        Read more
                    </button>
                </div>
            )}
        </Dialog>
    );
};
