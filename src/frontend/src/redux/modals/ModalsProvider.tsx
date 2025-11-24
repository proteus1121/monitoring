import { DeviceCreationModal } from './DeviceCreationModal';
import { AlertTemplateCreationModal } from './AlertTemplateCreationModal';
import { AppAlertDialog } from './AlertDialog';
import { AlertTemplateUpdatingModal } from './AlertTemplateUpdatingModal';

export function ModalsProvider() {
  return (
    <>
      <AlertTemplateUpdatingModal />
      <DeviceCreationModal />
      <AlertTemplateCreationModal />
      <AppAlertDialog />
    </>
  );
}
