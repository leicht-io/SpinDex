import * as React from 'react';
import { UIContext } from '../../context';
import { CHANGELOG, ChangelogEntry } from '../../core/changelog';
import { Dialog } from '../Dialog';

const SECTIONS: { key: 'added' | 'changed' | 'fixed'; label: string }[] = [
    { key: 'added', label: 'New' },
    { key: 'changed', label: 'Changed' },
    { key: 'fixed', label: 'Fixed' },
];

const formatDate = (iso: string): string =>
    new Date(`${ iso }T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const Release = ({ entry, latest }: { entry: ChangelogEntry; latest: boolean }): React.ReactElement => (
    // Plain divs: BeerCSS styles <article> as a padded card and gives every
    // <header> a 4rem min-height.
    <div className={ 'changelog-release' }>
        <div className={ 'changelog-release-header' }>
            <span className={ 'changelog-version' }>v{entry.version}</span>
            {latest && <span className={ 'changelog-latest' }>Current</span>}
            <time className={ 'changelog-date' }
                dateTime={ entry.date }>{formatDate(entry.date)}</time>
        </div>
        <h3 className={ 'changelog-title' }>{entry.title}</h3>
        {SECTIONS.map(({ key, label }) => {
            // eslint-disable-next-line security/detect-object-injection -- key is from the fixed SECTIONS list
            const items = entry[key];
            if (!items || items.length === 0) {
                return null;
            }
            return (
                <div key={ key }
                    className={ 'changelog-section' }>
                    {/* Prefixed: a bare `fixed` class trips BeerCSS's .fixed utility. */}
                    <h4 className={ `changelog-section-label section-${ key }` }>{label}</h4>
                    <ul>
                        {items.map(item => <li key={ item }>{item}</li>)}
                    </ul>
                </div>
            );
        })}
    </div>
);

export const ChangelogDialog = (): React.ReactElement => {
    const { closeDialog } = React.useContext(UIContext);

    return (
        <Dialog title={ 'What’s new' }
            eyebrow={ 'Changelog' }
            wide={ true }
            onClose={ closeDialog }>
            {CHANGELOG.map((entry, i) => (
                <Release key={ entry.version }
                    entry={ entry }
                    latest={ i === 0 } />
            ))}
        </Dialog>
    );
};
