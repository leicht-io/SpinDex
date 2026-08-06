import * as React from 'react';
import "./topbar.scss"

export const TopBar = (): React.ReactElement => {
  return (
          <header className={"topbar"}>
              <nav>
                  <svg className={"topbar-mark"} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                      <circle cx="12" cy="12" r="1.75" fill="currentColor"/>
                  </svg>
                  <h5 className="max">SpinDex</h5>
              </nav>
          </header>
  );
};
