import * as React from 'react';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { usePopover } from './usePopover';

export interface SelectOption {
    value: string;
    label: string;
    hint?: string;
    // Draw a separator above this option.
    divider?: boolean;
    // A command rather than a value (e.g. "+ New turntable…"), shown in copper.
    action?: boolean;
}

interface SelectProps {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    ariaLabel?: string;
    className?: string;
}

/**
 * A <select> replacement whose option list matches the app's menus. A
 * native <select> opens an OS-drawn list that ignores the theme entirely.
 * Keyboard: Enter/Space/ArrowDown open, arrows move, Enter picks, Escape
 * closes; typing a letter jumps to the next option starting with it.
 */
export const Select = ({ value, options, onChange, ariaLabel, className }: SelectProps): React.ReactElement => {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const listId = React.useId();

    usePopover(open, triggerRef, listRef, { matchWidth: true });

    const selected = options.find(o => o.value === value);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        const onPointerDown = (e: PointerEvent): void => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointerDown);
        // Start on the current value, like a native select.
        (listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
            ?? listRef.current?.querySelector<HTMLButtonElement>('button'))?.focus();
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const close = (): void => {
        setOpen(false);
        triggerRef.current?.focus();
    };

    const pick = (option: SelectOption): void => {
        onChange(option.value);
        close();
    };

    const onListKeyDown = (e: React.KeyboardEvent): void => {
        const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);

        if (e.key === 'Escape') {
            // Don't let it also reach an enclosing <dialog> and close that.
            e.preventDefault();
            e.stopPropagation();
            close();
        } else if (e.key === 'Tab') {
            setOpen(false);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const next = e.key === 'ArrowDown' ? index + 1 : index - 1;
            buttons[(next + buttons.length) % buttons.length]?.focus();
        } else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            buttons[e.key === 'Home' ? 0 : buttons.length - 1]?.focus();
        } else if (e.key.length === 1 && /\S/.test(e.key)) {
            const key = e.key.toLowerCase();
            const order = [...options.slice(index + 1), ...options.slice(0, index + 1)];
            const match = order.find(o => o.label.toLowerCase().startsWith(key));
            if (match) {
                buttons[options.indexOf(match)]?.focus();
            }
        }
    };

    return (
        <div className={ `select-root ${ className ?? '' }` }
            ref={ rootRef }>
            <button
                type="button"
                ref={ triggerRef }
                className={ `select-trigger ${ open ? 'open' : '' }` }
                aria-haspopup="listbox"
                aria-expanded={ open }
                aria-controls={ open ? listId : undefined }
                aria-label={ ariaLabel }
                onClick={ () => setOpen(o => !o) }
                onKeyDown={ (e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setOpen(true);
                    }
                } }>
                <span className={ 'select-value' }>{selected?.label ?? ''}</span>
                <ExpandMoreIcon fontSize={ 'small' }
                    className={ 'select-chevron' } />
            </button>

            {open && (
                <div
                    id={ listId }
                    ref={ listRef }
                    role="listbox"
                    popover="manual"
                    className={ 'menu-list select-list' }
                    onKeyDown={ onListKeyDown }>
                    {options.map((option, i) => (
                        <React.Fragment key={ option.value }>
                            {option.divider && i > 0 && <hr className={ 'menu-divider' } />}
                            <button
                                type="button"
                                role="option"
                                aria-selected={ option.value === value }
                                className={ `menu-item ${ option.action ? 'action' : '' }` }
                                onClick={ () => pick(option) }>
                                <span className={ 'menu-item-check' }>
                                    {option.value === value && <CheckIcon fontSize={ 'small' } />}
                                </span>
                                <span className={ 'menu-item-label' }>{option.label}</span>
                                {option.hint && <span className={ 'menu-item-hint' }>{option.hint}</span>}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
};
