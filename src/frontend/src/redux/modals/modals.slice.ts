import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ModalId, ModalsList } from './modals.types';
import { DeviceCreationModalId } from './DeviceCreationModal';
import { AlertTemplateCreationModalId } from './AlertTemplateCreationModal';
import { AppAlertDialogModalId } from './AlertDialog';
import { AlertTemplateUpdatingModalId } from './AlertTemplateUpdatingModal';
import { DeviceUpdatingModalId } from './DeviceUpdatingModal';
import { DeviceSharingCreationModalId } from './DeviceSharingCreationModal';

const initialState: ModalsList = {
  [DeviceCreationModalId]: false,
  [AlertTemplateCreationModalId]: false,
  [AppAlertDialogModalId]: null,
  [AlertTemplateUpdatingModalId]: null,
  [DeviceUpdatingModalId]: null,
  [DeviceSharingCreationModalId]: false,
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
