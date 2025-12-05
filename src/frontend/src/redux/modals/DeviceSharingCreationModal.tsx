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
import z from 'zod';
import { useAppForm } from '@src/components/Form';
import { FieldGroup, FieldLabel } from '@src/components/Field';
import { notification } from 'antd';
import { useShareDeviceMutation } from '../generatedApi';
import { useEffect, useMemo, useState } from 'react';
import { MultiSelect, Option } from '@src/components/MultiSelect';
import { useUsersWithDevices } from '@src/pages/UsersPage';

export const DeviceSharingCreationModalId = 'device-sharing-creation-modal-id';
export type DeviceSharingCreationModal = SimpleModalState<
  typeof DeviceSharingCreationModalId
>;

export const ShareDeviceSchema = z.object({
  username: z.string().min(1),
  role: z.enum(['EDITOR', 'VIEWER']),
  selectedDevices: z.number().array(),
});

export function DeviceSharingCreationModal() {
  const { state, setState } = useModal(DeviceSharingCreationModalId);
  const [shareDevice] = useShareDeviceMutation();
  const [deviceIds, setDeviceIds] = useState<Option[]>([]);

  const form = useAppForm({
    defaultValues: {
      username: '',
      role: 'VIEWER',
    } as any,
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
          role: parsed.data.role,
          username: parsed.data.username,
          deviceIds: deviceIds.map(i => i.value).map(Number),
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

  const { owner } = useUsersWithDevices();

  const options = useMemo(() => {
    return (owner?.devices ?? [])
      .filter(i => i.role === 'OWNER')
      .filter(i => !!i.deviceName && !!i.id)
      .map(i => {
        return {
          label: i.deviceName,
          value: i.id,
        } as any as Option;
      })
      .filter(i => !deviceIds.some(selected => selected.value == i.value));
  }, [owner]);

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
                  <field.TextField label="Username" placeholder="Ivan" />
                )}
              />

              <form.AppField
                name="role"
                children={field => (
                  <field.SelectField
                    label="Role"
                    placeholder="Viewer"
                    options={[
                      {
                        value: 'EDITOR',
                        label: 'Editor',
                      },

                      {
                        value: 'VIEWER',
                        label: 'Viewer',
                      },
                    ]}
                  />
                )}
              />

              <div className="flex flex-col gap-3">
                <FieldLabel>Devices</FieldLabel>

                <div className="flex gap-2">
                  <MultiSelect
                    options={options}
                    currentValue={deviceIds}
                    setCurrentValue={i => {
                      setDeviceIds(i);
                    }}
                  />
                  <Button
                    type="button"
                    variant={'secondary'}
                    onClick={() => {
                      setDeviceIds(options);
                    }}
                  >
                    Select all
                  </Button>
                </div>
              </div>
            </FieldGroup>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <form.Subscribe
              selector={state => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  disabled={!canSubmit || deviceIds.length <= 0}
                >
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
