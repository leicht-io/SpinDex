import * as React from 'react';
import './page.scss';

export const Page = (props: any): React.ReactElement => {
  return (
    <div className="page">
      { props.children }
    </div>
  );
};

