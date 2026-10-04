import { DeviceCreationModal } from './DeviceCreationModal';
import { AlertTemplateCreationModal } from './AlertTemplateCreationModal';
import { AppAlertDialog } from './AlertDialog';
import { AlertTemplateUpdatingModal } from './AlertTemplateUpdatingModal';
import { DeviceUpdatingModal } from './DeviceUpdatingModal';
import { DeviceSharingCreationModal } from './DeviceSharingCreationModal';
import { DeviceSharingUpdatingModal } from './DeviceSharingUpdatingModal';
import { DisplayModal } from './DisplayModal';
import { ModuleCreationModal } from './ModuleCreationModal';

export function ModalsProvider() {
  return (
    <>
      <AlertTemplateUpdatingModal />
      <DeviceCreationModal />
      <DeviceUpdatingModal />
      <AlertTemplateCreationModal />
      <AlertTemplateCreationModal />
      <DeviceSharingCreationModal />
      <DeviceSharingUpdatingModal />
      <ModuleCreationModal />
      <DisplayModal />
      <AppAlertDialog />
    </>
  );
}
