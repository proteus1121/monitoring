import { DeviceCreationModal } from './DeviceCreationModal';
import { AlertTemplateCreationModal } from './AlertTemplateCreationModal';

export function ModalsProvider() {
  return (
    <>
      <DeviceCreationModal />
      <AlertTemplateCreationModal />
    </>
  );
}
