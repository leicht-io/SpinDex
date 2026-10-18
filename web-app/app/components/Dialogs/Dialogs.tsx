import * as React from 'react';
import './dialogs.scss';
import { TrackingContext, UIContext } from '../../context';
import { Folder, Tracking } from '../../core/storage/db';
import { Dialog, Field } from '../Dialog';
import { findFolder, folderLabel } from '../../core/tracking/folders';
import { NewMeasurementDialog } from './NewMeasurementDialog';

const FolderDialog = ({ folder }: { folder?: Folder }): React.ReactElement => {
    const { folders, createFolder, updateFolder } = React.useContext(TrackingContext);
    const { closeDialog } = React.useContext(UIContext);
    const [name, setName] = React.useState(folder?.name ?? '');
    const [serial, setSerial] = React.useState(folder?.serialNumber ?? '');

    const duplicate = findFolder(folders, name, serial);
    const isDuplicate = duplicate !== undefined && duplicate.id !== folder?.id;

    const onSubmit = async (): Promise<void> => {
        if (folder) {
            await updateFolder(folder.id, name.trim(), serial.trim());
        } else {
            await createFolder(name.trim(), serial.trim());
        }
        closeDialog();
    };

    return (
        <Dialog title={ folder ? 'Edit turntable' : 'New turntable folder' }
            onClose={ closeDialog }
            onSubmit={ onSubmit }
            submitLabel={ folder ? 'Save' : 'Create' }
            submitDisabled={ !name.trim() || isDuplicate }>
            <p>Measurements are grouped by turntable, identified by its model and serial number.</p>
            <div className={ 'app-field-row' }>
                <Field label={ 'Model' }>
                    <input className={ 'app-input' }
                        placeholder={ 'Beogram 4002' }
                        value={ name }
                        autoFocus={ true }
                        onChange={ (e) => setName(e.target.value) } />
                </Field>
                <Field label={ 'Serial number' }>
                    <input className={ 'app-input' }
                        placeholder={ 'Optional' }
                        value={ serial }
                        onChange={ (e) => setSerial(e.target.value) } />
                </Field>
            </div>
            {isDuplicate && <p className={ 'dialog-note dialog-note-warning' }>A folder for this turntable already exists.</p>}
        </Dialog>
    );
};

const RenameDialog = ({ tracking }: { tracking: Tracking }): React.ReactElement => {
    const { renameTracking } = React.useContext(TrackingContext);
    const { closeDialog } = React.useContext(UIContext);
    const [name, setName] = React.useState(tracking.name);

    return (
        <Dialog title={ 'Rename measurement' }
            onClose={ closeDialog }
            onSubmit={ async () => {
                if (name.trim() !== tracking.name) {
                    await renameTracking(tracking.id, name.trim());
                }
                closeDialog();
            } }
            submitLabel={ 'Rename' }
            submitDisabled={ !name.trim() }>
            <Field label={ 'Name' }>
                <input className={ 'app-input' }
                    value={ name }
                    autoFocus={ true }
                    onFocus={ (e) => e.target.select() }
                    onChange={ (e) => setName(e.target.value) } />
            </Field>
        </Dialog>
    );
};

const MoveDialog = ({ tracking }: { tracking: Tracking }): React.ReactElement => {
    const { folders, moveTracking } = React.useContext(TrackingContext);
    const { closeDialog } = React.useContext(UIContext);
    const [folderId, setFolderId] = React.useState(tracking.folderId ?? '');

    return (
        <Dialog title={ 'Move to folder' }
            onClose={ closeDialog }
            onSubmit={ async () => {
                await moveTracking(tracking.id, folderId || null);
                closeDialog();
            } }
            submitLabel={ 'Move' }>
            <Field label={ `Move "${ tracking.name }" to` }>
                <select className={ 'app-input' }
                    value={ folderId }
                    onChange={ (e) => setFolderId(e.target.value) }>
                    {folders.map(folder => (
                        <option key={ folder.id }
                            value={ folder.id }>{folderLabel(folder)}</option>
                    ))}
                    <option value={ '' }>No folder</option>
                </select>
            </Field>
        </Dialog>
    );
};

const DeleteTrackingDialog = ({ tracking }: { tracking: Tracking }): React.ReactElement => {
    const { deleteTracking } = React.useContext(TrackingContext);
    const { closeDialog } = React.useContext(UIContext);

    return (
        <Dialog title={ 'Delete measurement?' }
            onClose={ closeDialog }
            onSubmit={ async () => {
                await deleteTracking(tracking.id);
                closeDialog();
            } }
            submitLabel={ 'Delete' }
            danger={ true }>
            <p>&quot;{tracking.name}&quot; and its {tracking.sampleCount.toLocaleString()} samples will be permanently deleted.</p>
        </Dialog>
    );
};

const DeleteFolderDialog = ({ folder }: { folder: Folder }): React.ReactElement => {
    const { trackings, deleteFolder } = React.useContext(TrackingContext);
    const { closeDialog } = React.useContext(UIContext);
    const count = trackings.filter(t => t.folderId === folder.id).length;

    return (
        <Dialog title={ 'Delete folder?' }
            onClose={ closeDialog }
            onSubmit={ async () => {
                await deleteFolder(folder.id);
                closeDialog();
            } }
            submitLabel={ 'Delete folder' }
            danger={ true }>
            <p>
                The folder <strong>{folderLabel(folder)}</strong> will be removed.
                {count > 0 && ` Its ${ count } measurement${ count === 1 ? '' : 's' } will be kept and moved to "Unfiled".`}
            </p>
        </Dialog>
    );
};

export const DialogHost = (): React.ReactElement | null => {
    const { dialog } = React.useContext(UIContext);

    switch (dialog?.kind) {
        case 'newMeasurement':
            return <NewMeasurementDialog folderId={ dialog.folderId } />;
        case 'folder':
            return <FolderDialog folder={ dialog.folder } />;
        case 'rename':
            return <RenameDialog tracking={ dialog.tracking } />;
        case 'move':
            return <MoveDialog tracking={ dialog.tracking } />;
        case 'deleteTracking':
            return <DeleteTrackingDialog tracking={ dialog.tracking } />;
        case 'deleteFolder':
            return <DeleteFolderDialog folder={ dialog.folder } />;
        default:
            return null;
    }
};
