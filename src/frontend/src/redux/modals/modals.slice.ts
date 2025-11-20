import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ModalId, ModalsList } from './modals.types';
import { createDeviceModalId } from './DeviceCreationModal';

const initialState: ModalsList = { [createDeviceModalId]: false };

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
