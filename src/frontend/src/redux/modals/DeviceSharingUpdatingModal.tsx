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
import { FieldGroup, FieldLabel } from '@src/components/Field';
import { notification } from 'antd';
import {
  useShareDeviceMutation,
  useUnshareDeviceMutation,
} from '../generatedApi';
import { useEffect, useMemo, useState } from 'react';
import { MultiSelect, Option } from '@src/components/MultiSelect';
import { FlatUserWithDevices, useUsersWithDevices } from '@src/pages/UsersPage';
import { current } from '@reduxjs/toolkit';

export const DeviceSharingUpdatingModalId = 'device-sharing-updating-modal-id';
export type DeviceSharingUpdatingModal = ModalState<
  typeof DeviceSharingUpdatingModalId,
  FlatUserWithDevices
>;

export const ShareDeviceSchema = z.object({
  username: z.string().min(1),
  role: z.enum(['EDITOR', 'VIEWER']),
});

export function DeviceSharingUpdatingModal() {
  const { state, setState } = useModal(DeviceSharingUpdatingModalId);
  const [shareDevice] = useShareDeviceMutation();
  const [unshareDevice] = useUnshareDeviceMutation();

  const [deviceIds, setDeviceIds] = useState<Option[]>([]);

  const { owner } = useUsersWithDevices();

  const currentOwnedDevices = useMemo(() => {
    return (owner?.devices ?? []).filter(i => i.role === 'OWNER');
  }, [owner]);

  const options = useMemo(() => {
    return currentOwnedDevices
      .map(i => {
        return {
          label: i.deviceName,
          value: i.id,
        } as any as Option;
      })
      .filter(i => !deviceIds.some(selected => selected.value == i.value));
  }, [owner, deviceIds]);

  const currentUpdatableUserDevices = useMemo(() => {
    if (!owner) return [];
    if (!owner.devices) return [];
    if (!state) return [];
    if (!state.devices) return [];

    const currentUpdatableUserDevices = state.devices.filter(i =>
      Boolean(options.find(option => Number(option.value) === i.id))
    );
    return currentUpdatableUserDevices;
  }, [owner, state]);

  useEffect(() => {
    setDeviceIds(
      currentUpdatableUserDevices.map(
        i =>
          ({
            label: i.deviceName,
            value: i.id,
          }) as any as Option
      )
    );
  }, [currentUpdatableUserDevices]);

  const form = useAppForm({
    defaultValues: {
      username: state?.username,
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

      const removed = currentUpdatableUserDevices
        .map(i => i.id)
        .filter(id => !deviceIds.some(device => Number(device.value) === id))
        .filter(i => i !== undefined);

      const shareRes = await shareDevice({
        shareDeviceRequest: {
          role: parsed.data.role,
          username: parsed.data.username,
          deviceIds: deviceIds.map(i => i.value).map(Number),
        },
      });

      const unshareRes = await unshareDevice({
        unshareDeviceRequest: {
          username: parsed.data.username,
          deviceIds: removed,
        },
      });

      if (shareRes.error) {
        notification.error({
          message: 'Failed to share devices',
          description: JSON.stringify(shareRes.error),
        });
      } else {
        notification.success({
          message: `Devices shared succesfully`,
        });
      }

      if (unshareRes.error) {
        notification.error({
          message: 'Failed to unshare devices',
          description: JSON.stringify(unshareRes.error),
        });
      } else {
        notification.success({
          message: `Devices unshared succesfully`,
        });
      }

      form.reset();
      setState(null);
    },
  });

  useEffect(() => {
    form.reset();
  }, [state]);

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
          id={DeviceSharingUpdatingModalId}
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
                      setDeviceIds(
                        currentOwnedDevices.map(
                          i =>
                            ({
                              value: i.id,
                              label: i.deviceName,
                            }) as any as Option
                        )
                      );
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
