import * as React from 'react';
import './menu.scss';
import CheckIcon from '@mui/icons-material/Check';
import { usePopover } from './usePopover';

export interface MenuItem {
    label: string;
    onSelect: () => void;
    icon?: React.ReactElement;
    disabled?: boolean;
    // Renders a check mark slot; true shows the mark (radio/toggle items).
    checked?: boolean;
    hint?: string;
    danger?: boolean;
}

export type MenuEntry = MenuItem | 'divider' | { heading: string };

interface MenuProps {
    // Content of the trigger button.
    label: React.ReactNode;
    ariaLabel?: string;
    triggerClassName?: string;
    items: MenuEntry[];
    align?: 'start' | 'end';
}

const isItem = (entry: MenuEntry): entry is MenuItem => typeof entry === 'object' && 'label' in entry;

/**
 * Dropdown menu built on plain buttons (BeerCSS styles every <button>
 * globally, which would fight a component library's own menu markup).
 * Click/Enter opens, Escape or a click outside closes, arrow keys move
 * between enabled items.
 */
export const Menu = ({ label, ariaLabel, triggerClassName, items, align = 'start' }: MenuProps): React.ReactElement => {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const listRef = React.useRef<HTMLDivElement>(null);
    const menuId = React.useId();

    usePopover(open, triggerRef, listRef, { align });

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
        listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();

        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    const close = (): void => {
        setOpen(false);
        triggerRef.current?.focus();
    };

    const onListKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Escape') {
            // Don't let it also reach an enclosing <dialog> and close that.
            e.preventDefault();
            e.stopPropagation();
            close();
            return;
        }
        if (e.key === 'Tab') {
            setOpen(false);
            return;
        }
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
            return;
        }

        e.preventDefault();
        const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? index + 1 : index - 1;
        buttons[(next + buttons.length) % buttons.length]?.focus();
    };

    const hasChecks = items.some(entry => isItem(entry) && entry.checked !== undefined);

    return (
        <div className={ 'menu-root' }
            ref={ rootRef }>
            <button
                ref={ triggerRef }
                className={ `menu-trigger ${ triggerClassName ?? '' } ${ open ? 'open' : '' }` }
                aria-haspopup="menu"
                aria-expanded={ open }
                aria-controls={ open ? menuId : undefined }
                aria-label={ ariaLabel }
                onClick={ () => setOpen(o => !o) }
                onKeyDown={ (e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setOpen(true);
                    }
                } }>
                {label}
            </button>

            {open && (
                <div
                    id={ menuId }
                    ref={ listRef }
                    role="menu"
                    popover="manual"
                    className={ 'menu-list' }
                    onKeyDown={ onListKeyDown }>
                    {items.map((entry, i) => {
                        if (entry === 'divider') {
                            return <hr key={ i }
                                className={ 'menu-divider' } />;
                        }
                        if (!isItem(entry)) {
                            return <span key={ i }
                                className={ 'menu-heading' }>{entry.heading}</span>;
                        }
                        return (
                            <button
                                key={ i }
                                role={ entry.checked === undefined ? 'menuitem' : 'menuitemradio' }
                                aria-checked={ entry.checked }
                                className={ `menu-item ${ entry.danger ? 'danger' : '' }` }
                                disabled={ entry.disabled }
                                onClick={ () => {
                                    setOpen(false);
                                    entry.onSelect();
                                } }>
                                {hasChecks && (
                                    <span className={ 'menu-item-check' }>
                                        {entry.checked && <CheckIcon fontSize={ 'small' } />}
                                    </span>
                                )}
                                {entry.icon && <span className={ 'menu-item-icon' }>{entry.icon}</span>}
                                <span className={ 'menu-item-label' }>{entry.label}</span>
                                {entry.hint && <span className={ 'menu-item-hint' }>{entry.hint}</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
