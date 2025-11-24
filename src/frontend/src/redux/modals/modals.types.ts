import { DeviceCreationModal } from './DeviceCreationModal';
import { AlertTemplateCreationModal } from './AlertTemplateCreationModal';
import { AlertDialogModal } from './AlertDialog';

export type SimpleModalState<T extends string> = {
  [K in T]: boolean;
};

export type ModalState<T extends string, U> = {
  [K in T]: U | null;
};

export type ModalsList = DeviceCreationModal &
  AlertTemplateCreationModal &
  AlertDialogModal;

export type ModalId = keyof ModalsList;
