import * as React from 'react';

const GAP = 6;
const VIEWPORT_MARGIN = 8;

interface PopoverOptions {
    align?: 'start' | 'end';
    // Make the panel at least as wide as its trigger (select-style).
    matchWidth?: boolean;
}

/**
 * Shows a dropdown panel in the browser's top layer (the Popover API) and
 * pins it under its trigger with fixed coordinates.
 *
 * The top layer is the point: a plain absolutely-positioned panel gets
 * clipped by any scrolling or overflow-hidden ancestor -- the dialog body,
 * the sidebar's scrolling tree -- and sits under a modal <dialog>. Flips
 * above the trigger when there's no room below, and follows it on scroll
 * and resize.
 */
export const usePopover = (
    open: boolean,
    triggerRef: React.RefObject<HTMLElement | null>,
    panelRef: React.RefObject<HTMLElement | null>,
    { align = 'start', matchWidth = false }: PopoverOptions = {},
): void => {
    React.useLayoutEffect(() => {
        const panel = panelRef.current;
        const trigger = triggerRef.current;
        if (!open || !panel || !trigger) {
            return;
        }

        // Feature-detected: without the Popover API the panel still renders
        // as a fixed-position element, just without the top-layer benefits.
        if (typeof panel.showPopover === 'function' && !panel.matches(':popover-open')) {
            panel.showPopover();
        }

        const place = (): void => {
            const t = trigger.getBoundingClientRect();
            if (matchWidth) {
                panel.style.minWidth = `${ t.width }px`;
            }
            const p = panel.getBoundingClientRect();

            let top = t.bottom + GAP;
            const fitsBelow = top + p.height <= window.innerHeight - VIEWPORT_MARGIN;
            const fitsAbove = t.top - GAP - p.height >= VIEWPORT_MARGIN;
            if (!fitsBelow && fitsAbove) {
                top = t.top - GAP - p.height;
            }

            const preferred = align === 'end' ? t.right - p.width : t.left;
            const left = Math.min(Math.max(preferred, VIEWPORT_MARGIN), window.innerWidth - p.width - VIEWPORT_MARGIN);

            panel.style.top = `${ Math.max(VIEWPORT_MARGIN, top) }px`;
            panel.style.left = `${ left }px`;
        };

        place();
        window.addEventListener('resize', place);
        // Capture: scrolls of any ancestor (sidebar tree, dialog body) don't
        // bubble to window otherwise.
        window.addEventListener('scroll', place, true);

        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
            if (typeof panel.hidePopover === 'function' && panel.matches(':popover-open')) {
                panel.hidePopover();
            }
        };
    }, [open, align, matchWidth]);
};
