import * as React from 'react';
import './dialog.scss';

interface DialogProps {
    title: string;
    onClose: () => void;
    // Called on Enter / the primary button; omit for an info-only dialog.
    onSubmit?: () => void;
    submitLabel?: string;
    submitDisabled?: boolean;
    danger?: boolean;
    // Keeps it open: Escape, the backdrop and Cancel/Close do nothing.
    closeDisabled?: boolean;
    // Small mono label above the title.
    eyebrow?: string;
    wide?: boolean;
    children?: React.ReactNode;
}

/**
 * Modal built on the native <dialog> (focus trap, Escape and the top layer
 * come for free; BeerCSS already styles `dialog[open]`). Mounted only
 * while open -- DialogHost unmounts it on close.
 */
export const Dialog = (props: DialogProps): React.ReactElement => {
    const { title, onClose, onSubmit, submitLabel = 'OK', submitDisabled, danger, closeDisabled, eyebrow, wide, children } = props;
    const close = (): void => {
        if (!closeDisabled) {
            onClose();
        }
    };
    const ref = React.useRef<HTMLDialogElement>(null);
    const titleId = React.useId();

    React.useEffect(() => {
        const dialog = ref.current;
        if (dialog && !dialog.open) {
            dialog.showModal();
        }
        return () => dialog?.close();
    }, []);

    return (
        <dialog
            ref={ ref }
            className={ `app-dialog ${ wide ? 'wide' : '' }` }
            aria-labelledby={ titleId }
            // Escape: let React unmount it rather than the browser closing it
            // behind React's back.
            onCancel={ (e) => {
                e.preventDefault();
                close();
            } }
            onClick={ (e) => {
                // A click on the dialog element itself (not its content) is a
                // click on the backdrop.
                if (e.target === ref.current) {
                    close();
                }
            } }>
            <form
                method="dialog"
                onSubmit={ (e) => {
                    e.preventDefault();
                    if (onSubmit && !submitDisabled) {
                        onSubmit();
                    }
                } }>
                {eyebrow && <span className={ 'app-dialog-eyebrow' }>{eyebrow}</span>}
                <h2 id={ titleId }
                    className={ 'app-dialog-title' }>{title}</h2>

                <div className={ 'app-dialog-body' }>{children}</div>

                <div className={ 'app-dialog-actions' }>
                    <button type="button"
                        className={ 'transparent' }
                        disabled={ closeDisabled }
                        onClick={ close }>
                        {onSubmit ? 'Cancel' : 'Close'}
                    </button>
                    {onSubmit && (
                        <button type="submit"
                            className={ danger ? 'app-dialog-danger' : 'primary' }
                            disabled={ submitDisabled }>
                            {submitLabel}
                        </button>
                    )}
                </div>
            </form>
        </dialog>
    );
};

interface FieldProps {
    label: string;
    children: React.ReactElement;
    hint?: string;
}

export const Field = ({ label, children, hint }: FieldProps): React.ReactElement => (
    <label className={ 'app-field' }>
        <span className={ 'app-field-label' }>{label}</span>
        {children}
        {hint && <span className={ 'app-field-hint' }>{hint}</span>}
    </label>
);
