import { CreateDeviceModal } from './DeviceCreationModal';

export type SimpleModalState<T extends string> = {
  [K in T]: boolean;
};

export type ModalState<T extends string, U> = {
  [K in T]: U | null;
};

export type ModalsList = CreateDeviceModal;

export type ModalId = keyof ModalsList;
