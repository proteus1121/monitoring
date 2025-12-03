import { DeviceCreationModal } from './DeviceCreationModal';
import { AlertTemplateCreationModal } from './AlertTemplateCreationModal';
import { AppAlertDialogModal } from './AlertDialog';
import { AlertTemplateUpdatingModal } from './AlertTemplateUpdatingModal';
import { DeviceUpdatingModal } from './DeviceUpdatingModal';
import { DeviceSharingCreationModal } from './DeviceSharingCreationModal';

export type SimpleModalState<T extends string> = {
  [K in T]: boolean;
};

export type ModalState<T extends string, U> = {
  [K in T]: U | null;
};

export type ModalsList = DeviceCreationModal &
  AlertTemplateCreationModal &
  AppAlertDialogModal &
  AlertTemplateUpdatingModal &
  DeviceUpdatingModal &
  DeviceSharingCreationModal;

export type ModalId = keyof ModalsList;
