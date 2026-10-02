import { useModal } from './modals.hook';
import { SimpleModalState } from './modals.types';
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
import { useEffect } from 'react';
import { useCreateDeviceMutation } from '../generatedApi';
import {
  DeviceFormFields,
  DeviceSchema,
  toDeviceFormValues,
  toDeviceRequest,
} from './DeviceFormFields';

export const DeviceCreationModalId = 'device-creation-modal-id';
export type DeviceCreationModal = SimpleModalState<
  typeof DeviceCreationModalId
>;

export function DeviceCreationModal() {
  const { state, setState } = useModal(DeviceCreationModalId);
  const [createDevice] = useCreateDeviceMutation();

  const form = useAppForm({
    defaultValues: toDeviceFormValues(null),
    validators: {
      onSubmit: DeviceSchema as any,
    },
    onSubmit: async ({ value }) => {
      const parsed = DeviceSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }

      const res = await createDevice({
        deviceRequest: toDeviceRequest(parsed.data),
      });
      if (res.data) {
        notification.success({
          message: `${parsed.data.name} created succesfully`,
        });
      } else {
        notification.error({
          message: 'Failed to create device',
          description: JSON.stringify(res.error),
        });
        return;
      }

      form.reset();
      setState(false);
    },
  });

  useEffect(() => {
    if (state) form.reset();
  }, [state]);

  return (
    <Dialog open={state} onOpenChange={setState}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form
          className="contents"
          id={DeviceCreationModalId}
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Create Device</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <DeviceFormFields form={form} />
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
