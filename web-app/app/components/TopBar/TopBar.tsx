import * as React from 'react';
import "./topbar.scss"

export const TopBar = (): React.ReactElement => {
  return (
          <header className={"topbar"}>
              <nav>
                  <h5 className="max center-align">SpinDex</h5>
              </nav>
          </header>
  );
};

