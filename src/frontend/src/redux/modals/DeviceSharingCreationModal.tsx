import { useModal } from './modals.hook';
import { ModalState, SimpleModalState } from './modals.types';
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
import { useShareDeviceMutation } from '../generatedApi';
import { useEffect } from 'react';

export const DeviceSharingCreationModalId = 'device-sharing-creation-modal-id';
export type DeviceSharingCreationModal = SimpleModalState<
  typeof DeviceSharingCreationModalId
>;

export const ShareDeviceSchema = z.object({
  username: z.string().min(1),
});

export function DeviceSharingCreationModal() {
  const { state, setState } = useModal(DeviceSharingCreationModalId);
  const [shareDevice] = useShareDeviceMutation();

  const form = useAppForm({
    defaultValues: {
      username: '',
    },
    validators: {
      onSubmit: ShareDeviceSchema as any,
    },
    onSubmit: async ({ value }) => {
      const parsed = ShareDeviceSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }

      const res = await shareDevice({
        shareDeviceRequest: {
          role: 'VIEWER',
          username: 'Oleksandr',
          deviceIds: [],
        },
      });

      if (res.data) {
        notification.success({
          message: `Devices shared created succesfully`,
        });
      } else {
        notification.error({
          message: 'Failed to share devices',
          description: JSON.stringify(res.error),
        });
      }

      form.reset();
      setState(false);
    },
  });

  useEffect(() => {
    form.reset();
  }, [state]);

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={open => {
        if (!open) setState(false);
      }}
    >
      <DialogContent>
        <form
          className="contents"
          id={DeviceSharingCreationModalId}
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Share Devices</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldGroup>
              <form.AppField
                name="username"
                children={field => (
                  <field.TextField label="Username" placeholder="Petya" />
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
