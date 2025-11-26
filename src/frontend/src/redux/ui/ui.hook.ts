import { useCallback } from 'react';
import { useActions } from '../helpers';
import { useTypedSelector } from '../store';
import { uiSlice } from './ui.slice';

export function useUi() {
  const state = useTypedSelector(state => state.ui);
  const actions = useActions(uiSlice.actions);

  return {
    state,
    ...actions,
  };
}
