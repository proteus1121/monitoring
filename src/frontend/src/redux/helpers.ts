import type { ActionCreatorsMapObject } from '@reduxjs/toolkit';
import { useTypedDispatch } from './store';

export const useActions = <T extends ActionCreatorsMapObject>(
  sliceActions: T
) => {
  const dispatch = useTypedDispatch();

  return Object.entries(sliceActions).reduce(
    (acc, [key, actionCreator]) => {
      acc[key as keyof T] = (...args: Parameters<typeof actionCreator>) =>
        dispatch(actionCreator(...args));
      return acc;
    },
    {} as { [key in keyof T]: (...args: Parameters<T[key]>) => void }
  );
};
