import { DeviceCreationModal } from './DeviceCreationModal';
import { AlertTemplateCreationModal } from './AlertTemplateCreationModal';
import { AppAlertDialog } from './AlertDialog';
import { AlertTemplateUpdatingModal } from './AlertTemplateUpdatingModal';
import { DeviceUpdatingModal } from './DeviceUpdatingModal';
import { DeviceSharingCreationModal } from './DeviceSharingCreationModal';

export function ModalsProvider() {
  return (
    <>
      <AlertTemplateUpdatingModal />
      <DeviceCreationModal />
      <DeviceUpdatingModal />
      <AlertTemplateCreationModal />
      <AlertTemplateCreationModal />
      <DeviceSharingCreationModal />
      <AppAlertDialog />
    </>
  );
}
