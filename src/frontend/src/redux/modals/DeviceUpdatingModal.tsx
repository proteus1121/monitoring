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
import z from 'zod';
import { useAppForm } from '@src/components/Form';
import { FieldGroup } from '@src/components/Field';
import { notification } from 'antd';
import { Device, useUpdateDeviceMutation } from '../generatedApi';
import { DeviceType } from '@src/lib/api/api.types';

export const DeviceUpdatingModalId = 'device-updating-modal-id';
export type DeviceUpdatingModal = ModalState<
  typeof DeviceUpdatingModalId,
  Device
>;

export const UpdateDeviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  criticalValue: z.coerce.number<string>().or(z.undefined()),
  lowerValue: z.coerce.number<string>().or(z.undefined()),
  delay: z.coerce.number<string>(),
  deviceType: z.enum(DeviceType).optional(), // TODO: try to inherit DeviceType from Device provided by openapi
});

export function DeviceUpdatingModal() {
  const { state, setState } = useModal(DeviceUpdatingModalId);
  const [updateDevice] = useUpdateDeviceMutation();

  const form = useAppForm({
    defaultValues: state,
    validators: {
      onSubmit: UpdateDeviceSchema as any,
    },
    onSubmit: async ({ value }) => {
      const parsed = UpdateDeviceSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }
      const id = state?.id;

      if (!id) {
        return;
      }

      const res = await updateDevice({
        id,
        deviceRequest: {
          ...parsed.data,
        },
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
      }

      form.reset();
      setState(null);
    },
  });

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={open => {
        form.reset();
        if (!open) setState(null);
      }}
    >
      <DialogContent>
        <form
          className="contents"
          id={DeviceUpdatingModalId}
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Create Device</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldGroup>
              <form.AppField
                name="name"
                children={field => (
                  <field.TextField
                    label="Device name"
                    placeholder="my device"
                  />
                )}
              />

              <form.AppField
                name="description"
                children={field => (
                  <field.TextareaField
                    label="Description"
                    placeholder="Does something interesting"
                  />
                )}
              />

              <form.AppField
                name="criticalValue"
                children={field => (
                  <field.TextField label="Critical value" placeholder="0" />
                )}
              />

              <form.AppField
                name="lowerValue"
                children={field => (
                  <field.TextField label="Lower value" placeholder="0" />
                )}
              />

              <form.AppField
                name="delay"
                children={field => (
                  <field.TextField label="Delay (ms)" placeholder="1000" />
                )}
              />
            </FieldGroup>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>Cancel</Button>
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
