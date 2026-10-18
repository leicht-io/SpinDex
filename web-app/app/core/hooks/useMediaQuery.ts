import * as React from 'react';

/** Live result of a CSS media query, re-rendering when it flips. */
export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = React.useState(() => window.matchMedia(query).matches);
    React.useEffect(() => {
        const list = window.matchMedia(query);
        const onChange = (): void => setMatches(list.matches);
        onChange();
        list.addEventListener('change', onChange);
        return () => list.removeEventListener('change', onChange);
    }, [query]);
    return matches;
};

// Phone width, where charts need fewer axis ticks to keep labels apart.
export const NARROW_QUERY = '(max-width: 600px)';
