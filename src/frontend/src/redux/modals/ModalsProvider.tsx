import { DeviceCreationModal } from './DeviceCreationModal';
import { AlertTemplateCreationModal } from './AlertTemplateCreationModal';
import { AppAlertDialog } from './AlertDialog';

export function ModalsProvider() {
  return (
    <>
      <DeviceCreationModal />
      <AlertTemplateCreationModal />
      <AppAlertDialog />
    </>
  );
}
