import * as React from 'react';
import BluetoothSearchingIcon from '@mui/icons-material/BluetoothSearching';
import { BLEContext, TrackingContext, UIContext } from '../../context';
import { Dialog, Field } from '../Dialog';
import { findFolder, folderLabel } from '../../core/tracking/folders';

const NEW_FOLDER = '__new__';
const NO_FOLDER = '';

interface NewMeasurementDialogProps {
    folderId?: string | null;
}

export const NewMeasurementDialog = ({ folderId }: NewMeasurementDialogProps): React.ReactElement => {
    const { connected, available, initBluetooth } = React.useContext(BLEContext);
    const { folders, activeTracking, viewingTracking, startTracking, stopTracking, createFolder } = React.useContext(TrackingContext);
    const { closeDialog, setViewMode } = React.useContext(UIContext);

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
    const canSubmit = connected && !busy && (!isNewFolder || model.trim() !== '');

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
            onClose={ closeDialog }
            onSubmit={ onSubmit }
            submitLabel={ 'Start recording' }
            submitDisabled={ !canSubmit }>
            <Field label={ 'Turntable' }>
                <select className={ 'app-input' }
                    value={ folderChoice }
                    onChange={ (e) => setFolderChoice(e.target.value) }>
                    {folders.map(folder => (
                        <option key={ folder.id }
                            value={ folder.id }>{folderLabel(folder)}</option>
                    ))}
                    <option value={ NEW_FOLDER }>+ New turntable…</option>
                    <option value={ NO_FOLDER }>No folder</option>
                </select>
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

            {!connected && (
                <div className={ 'dialog-note dialog-note-warning' }>
                    <span>Pair with the SpinDex sensor to start recording.</span>
                    <button type="button"
                        className={ 'small' }
                        disabled={ available === false }
                        onClick={ () => initBluetooth() }>
                        <BluetoothSearchingIcon fontSize={ 'small' } /> Connect
                    </button>
                </div>
            )}
        </Dialog>
    );
};
