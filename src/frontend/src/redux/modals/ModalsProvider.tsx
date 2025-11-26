import { DeviceCreationModal } from './DeviceCreationModal';
import { AlertTemplateCreationModal } from './AlertTemplateCreationModal';
import { AppAlertDialog } from './AlertDialog';
import { AlertTemplateUpdatingModal } from './AlertTemplateUpdatingModal';
import { DeviceUpdatingModal } from './DeviceUpdatingModal';

export function ModalsProvider() {
  return (
    <>
      <AlertTemplateUpdatingModal />
      <DeviceCreationModal />
      <DeviceUpdatingModal />
      <AlertTemplateCreationModal />
      <AppAlertDialog />
    </>
  );
}
