import { useModal } from './modals.hook';
import { ModalState } from './modals.types';
import { Spinner } from '@src/components/Spinner';
import { Button } from '@src/components/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/Dialog';
import { useAppForm } from '@src/components/Form';
import { notification } from 'antd';
import { errorMessage } from '../helpers';
import { Device, useDeleteDeviceMutation, useUpdateDeviceMutation } from '../generatedApi';
import { useEffect } from 'react';
import { ModuleArt } from '@src/components/ModuleArt';
import { Icon } from '@iconify/react';
import { AppAlertDialogModalId } from './AlertDialog';
import { pick } from '@src/lib/lang';

const TEXTS = {
  uk: {
    deleteConfirm: (name?: string) => `Видалити ${name} разом з історією?`,
    deleteFailed: (name?: string) => `Не вдалося видалити ${name}`,
    deleted: (name?: string) => `Видалено ${name}`,
    updated: (name: string) => `${name} збережено`,
    updateFailed: 'Не вдалося зберегти пристрій',
    title: 'Редагування пристрою',
    delete: 'Видалити',
    cancel: 'Скасувати',
    submit: 'Зберегти',
  },
  en: {
    deleteConfirm: (name?: string) => `Delete ${name} with its history?`,
    deleteFailed: (name?: string) => `Failed to delete ${name}`,
    deleted: (name?: string) => `Deleted ${name}`,
    updated: (name: string) => `${name} updated successfully`,
    updateFailed: 'Failed to update device',
    title: 'Update Device',
    delete: 'Delete',
    cancel: 'Cancel',
    submit: 'Submit',
  },
};
import {
  DeviceFormFields,
  DeviceSchema,
  notifyInvalidDevice,
  toDeviceFormValues,
  toDeviceRequest,
} from './DeviceFormFields';

export const DeviceUpdatingModalId = 'device-updating-modal-id';
export type DeviceUpdatingModal = ModalState<
  typeof DeviceUpdatingModalId,
  Device
>;

/**
 * Deletes a device with its history after a confirmation; `onDeleted` runs once it is gone.
 */
export function useDeleteDevice() {
  const [deleteDevice] = useDeleteDeviceMutation();
  const { setState: confirm } = useModal(AppAlertDialogModalId);

  return (device: Device, onDeleted?: () => void) =>
    confirm({
      description: pick(TEXTS).deleteConfirm(device.name),
      callback: async () => {
        const res = await deleteDevice({ id: device.id! });
        if ('error' in res) {
          notification.error({
            message: pick(TEXTS).deleteFailed(device.name),
            description: errorMessage(res.error),
          });
        } else {
          notification.success({ message: pick(TEXTS).deleted(device.name) });
          onDeleted?.();
        }
      },
    });
}

export function DeviceUpdatingModal() {
  const { state, setState } = useModal(DeviceUpdatingModalId);
  const [updateDevice] = useUpdateDeviceMutation();
  const deleteDevice = useDeleteDevice();

  const form = useAppForm({
    defaultValues: toDeviceFormValues(state),
    validators: {
      onSubmit: DeviceSchema as any,
    },
    onSubmitInvalid: ({ value }) => notifyInvalidDevice(value),
    onSubmit: async ({ value }) => {
      const parsed = DeviceSchema.safeParse(value);

      if (!parsed.success) {
        notifyInvalidDevice(value);
        return;
      }
      const id = state?.id;

      if (!id) {
        return;
      }

      const res = await updateDevice({
        id,
        deviceRequest: toDeviceRequest(parsed.data),
      });

      if (res.data) {
        notification.success({
          message: pick(TEXTS).updated(parsed.data.name),
        });
      } else {
        notification.error({
          message: pick(TEXTS).updateFailed,
          description: errorMessage(res.error),
        });
        return;
      }

      form.reset();
      setState(null);
    },
  });

  useEffect(() => {
    form.reset(toDeviceFormValues(state));
  }, [state]);

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={open => {
        if (!open) setState(null);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form
          className="contents"
          id={DeviceUpdatingModalId}
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {state?.sensorModel && (
                <ModuleArt module={state.sensorModel} showLabels={false} className="h-9 w-12 shrink-0" />
              )}
              {state?.name ?? pick(TEXTS).title}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <DeviceFormFields form={form} device={state} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 hover:text-red-700 sm:mr-auto"
              onClick={() => state && deleteDevice(state, () => setState(null))}
            >
              <Icon icon="lucide:trash-2" />
              {pick(TEXTS).delete}
            </Button>
            <DialogClose asChild>
              <Button variant="secondary">{pick(TEXTS).cancel}</Button>
            </DialogClose>
            <form.Subscribe
              selector={state => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting && <Spinner />}
                  {pick(TEXTS).submit}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
