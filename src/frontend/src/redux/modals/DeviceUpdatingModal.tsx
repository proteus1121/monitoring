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
import { Device, useUpdateDeviceMutation } from '../generatedApi';
import { useEffect } from 'react';
import { ModuleArt } from '@src/components/ModuleArt';
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

export function DeviceUpdatingModal() {
  const { state, setState } = useModal(DeviceUpdatingModalId);
  const [updateDevice] = useUpdateDeviceMutation();

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
          message: `${parsed.data.name} updated succesfully`,
        });
      } else {
        notification.error({
          message: 'Failed to update device',
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
              {state?.name ?? 'Update Device'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <DeviceFormFields form={form} device={state} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <form.Subscribe
              selector={state => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting && <Spinner />}
                  Submit
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
