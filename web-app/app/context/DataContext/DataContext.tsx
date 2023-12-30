import * as React from 'react';
import { IContextProps, IProps } from './types';

export const DataContext = React.createContext({} as IContextProps);

export const DataProvider = (props: IProps): React.ReactElement => {
  const [internalData, setInternalData] = React.useState<{ rpm: number; timestamp: number }[]>([]);

  const setData = (value: number) => {
    setInternalData(internalData => {
      return [...internalData, { value: value, timestamp: Date.now() }];
    });
  };

  return (
    <DataContext.Provider value={ {
      setData,
      data: internalData
    } }>
      {props.children}
    </DataContext.Provider>
  );
};

export const DataConsumer = DataContext.Consumer;
