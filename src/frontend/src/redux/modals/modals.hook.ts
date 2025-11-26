import { useCallback } from 'react';
import { modalsSlice } from './modals.slice';
import { ModalId, ModalsList } from './modals.types';
import { useActions } from '../helpers';
import { useTypedSelector } from '../store';

export function useModals() {
  const state = useTypedSelector(state => state.modals);
  const actions = useActions(modalsSlice.actions);

  return {
    ...state,
    ...actions,
  };
}

export function useModal<T extends ModalId>(modalId: T) {
  const state = useTypedSelector(state => state.modals[modalId]);
  const actions = useActions(modalsSlice.actions);

  const setState = useCallback(
    (modalState: ModalsList[T]) => {
      actions.setState({ modalId, modalState });
    },
    [actions, modalId]
  );

  return {
    state,
    setState,
  };
}
