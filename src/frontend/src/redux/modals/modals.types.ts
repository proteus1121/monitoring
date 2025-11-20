import { DeviceCreationModal } from './DeviceCreationModal';

export type SimpleModalState<T extends string> = {
  [K in T]: boolean;
};

export type ModalState<T extends string, U> = {
  [K in T]: U | null;
};

export type ModalsList = DeviceCreationModal;

export type ModalId = keyof ModalsList;
