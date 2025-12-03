import { useModal } from './modals.hook';
import { SimpleModalState } from './modals.types';
import { DeviceType } from '@src/lib/api/api.types';
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
import { useCreateDeviceMutation } from '../generatedApi';

export const DeviceCreationModalId = 'device-creation-modal-id';
export type DeviceCreationModal = SimpleModalState<
  typeof DeviceCreationModalId
>;

export const CreateDeviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().max(200).optional(),
  criticalValue: z.coerce.number<string>().or(z.undefined()),
  lowerValue: z.coerce.number<string>().or(z.undefined()),
  delay: z.coerce.number<string>(),
  deviceType: z.enum(DeviceType).optional(),
});

export function DeviceCreationModal() {
  const { state, setState } = useModal(DeviceCreationModalId);
  const [createDevice] = useCreateDeviceMutation();

  const form = useAppForm({
    validators: {
      onSubmit: CreateDeviceSchema as any,
    },
    onSubmit: async ({ value }) => {
      const parsed = CreateDeviceSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }

      const res = await createDevice({ deviceRequest: parsed.data });
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
      setState(false);

      window.location.reload();
    },
  });

  return (
    <Dialog open={state} onOpenChange={setState}>
      <DialogContent>
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

              <div className="flex gap-2">
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
              </div>

              <form.AppField
                name="delay"
                children={field => (
                  <field.TextField
                    label="Delay (ms)"
                    placeholder="1000"
                    defaultValue={1000}
                  />
                )}
              />
            </FieldGroup>
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
