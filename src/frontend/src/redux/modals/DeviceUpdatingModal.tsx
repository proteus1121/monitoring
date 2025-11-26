import { useModal } from './modals.hook';
import { ModalState } from './modals.types';
import { Device, DeviceType } from '@src/lib/api/api.types';
import { useApi } from '@src/lib/api/ApiProvider';
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
  delayMs: z.coerce.number<string>().or(z.undefined()),
  deviceType: z.enum(DeviceType).optional(),
});

export function DeviceUpdatingModal() {
  const { state, setState } = useModal(DeviceUpdatingModalId);
  const api = useApi();

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
      if (!state || !state.id) {
        return;
      }

      const res = await api.updateDevice({ ...parsed.data, id: state.id });
      if (res.ok) {
        notification.success({
          message: `${parsed.data.name} created succesfully`,
        });
      } else {
        notification.error({
          message: 'Failed to create device',
          description: res.message,
        });
      }

      form.reset();
      setState(null);

      //HACK : workaround because we do not have query caching yet, so devices wouldn't be refetched
      // TODO: remove when react-query will be used
      window.location.reload();
    },
  });

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={open => {
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
                name="delayMs"
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
