import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ModalId, ModalsList } from './modals.types';
import { DeviceCreationModalId } from './DeviceCreationModal';
import { AlertTemplateCreationModalId } from './AlertTemplateCreationModal';
import { AlertDialogModalId } from './AlertDialog';
import { AlertTemplateUpdatingModalId } from './AlertTemplateUpdatingModal';
import { DeviceUpdatingModalId } from './DeviceUpdatingModal';

const initialState: ModalsList = {
  [DeviceCreationModalId]: false,
  [AlertTemplateCreationModalId]: false,
  [AlertDialogModalId]: null,
  [AlertTemplateUpdatingModalId]: null,
  [DeviceUpdatingModalId]: null,
};

export const modalsSlice = createSlice({
  name: 'modals',
  initialState,
  reducers: {
    setState: <T extends ModalId>(
      state: ModalsList,
      action: PayloadAction<{
        modalId: T;
        modalState: ModalsList[T];
      }>
    ) => {
      const { modalId, modalState } = action.payload;
      state[modalId] = modalState;
    },
  },
});
