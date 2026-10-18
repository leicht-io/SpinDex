import * as React from 'react';
import './logo.scss';

/*
  The SpinDex mark: a stroboscope disc read against a fixed index.

  - The ring of ticks is a strobe scale, the classic way to check a
    platter's speed by eye.
  - The copper tick at 12 o'clock is the index (the "Dex"), and it never
    moves.
  - The ribbed disc is the Beogram 4000's platter with its parallel bars.
    It turns behind the index only while a recording is running, so the
    logo doubles as a live "measuring" indicator.

  Drawn on a 32-unit grid. Geometry is generated, not hand-placed, so the
  ticks stay evenly spaced.
*/

const C = 16;
const TICKS = 24;
const TICK_INNER = 11.75;
const TICK_OUTER = 13.75;
// The index reaches in to the platter rim, like a pointer read against it.
const INDEX_INNER = 9.4;
const INDEX_OUTER = 15.5;
const PLATTER_R = 9;
const RIB_COUNT = 7;
const RIB_PITCH = 2.25;
const RIB_HEIGHT = 1.15;

const polar = (r: number, deg: number): [number, number] => {
    const rad = (deg - 90) * Math.PI / 180;
    return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
};

// Every tick except 12 o'clock, where the index sits.
const TICK_PATH = Array.from({ length: TICKS - 1 }, (_, i) => {
    const deg = (i + 1) * (360 / TICKS);
    const [x1, y1] = polar(TICK_INNER, deg);
    const [x2, y2] = polar(TICK_OUTER, deg);
    return `M${ x1.toFixed(3) } ${ y1.toFixed(3) }L${ x2.toFixed(3) } ${ y2.toFixed(3) }`;
}).join('');

const RIB_YS = Array.from({ length: RIB_COUNT }, (_, i) => C + (i - (RIB_COUNT - 1) / 2) * RIB_PITCH - RIB_HEIGHT / 2);

interface SpinDexMarkProps {
    size?: number;
    // Turn the platter (recording in progress).
    spinning?: boolean;
    className?: string;
}

export const SpinDexMark = ({ size = 28, spinning = false, className }: SpinDexMarkProps): React.ReactElement => {
    // Unique per instance: two marks on one page must not share a clipPath id.
    const clipId = `spindex-platter-${ React.useId().replace(/:/g, '') }`;

    return (
        <svg className={ `spindex-mark ${ spinning ? 'spinning' : '' } ${ className ?? '' }` }
            viewBox="0 0 32 32"
            width={ size }
            height={ size }
            aria-hidden="true">
            <defs>
                <clipPath id={ clipId }>
                    <circle cx={ C }
                        cy={ C }
                        r={ PLATTER_R - 1.75 } />
                </clipPath>
            </defs>

            <path className={ 'spindex-mark-ticks' }
                d={ TICK_PATH }
                stroke="currentColor"
                strokeWidth={ 1 }
                strokeLinecap="butt" />

            <g className={ 'spindex-mark-platter' }>
                <circle cx={ C }
                    cy={ C }
                    r={ PLATTER_R - .5 }
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={ 1 } />
                <g clipPath={ `url(#${ clipId })` }
                    fill="currentColor">
                    {RIB_YS.map(y => (
                        <rect key={ y }
                            x={ C - PLATTER_R }
                            y={ y }
                            width={ PLATTER_R * 2 }
                            height={ RIB_HEIGHT } />
                    ))}
                </g>
            </g>

            {/* Spindle: a cut-out ring so it reads on top of the ribs. */}
            <circle cx={ C }
                cy={ C }
                r={ 2.5 }
                className={ 'spindex-mark-cutout' } />
            <circle cx={ C }
                cy={ C }
                r={ 1.25 }
                className={ 'spindex-mark-accent' } />

            <line className={ 'spindex-mark-accent-stroke' }
                x1={ C }
                y1={ C - INDEX_OUTER }
                x2={ C }
                y2={ C - INDEX_INNER }
                strokeWidth={ 1.5 }
                strokeLinecap="butt" />
        </svg>
    );
};
