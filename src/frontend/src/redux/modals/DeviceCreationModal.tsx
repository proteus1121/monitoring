import { useModal } from './modals.hook';
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
import { pick } from '@src/lib/lang';

const TEXTS = {
  uk: {
    created: (name: string) => `${name} створено`,
    createFailed: 'Не вдалося створити пристрій',
    title: 'Новий пристрій',
    cancel: 'Скасувати',
    submit: 'Зберегти',
  },
  en: {
    created: (name: string) => `${name} created successfully`,
    createFailed: 'Failed to create device',
    title: 'Create Device',
    cancel: 'Cancel',
    submit: 'Submit',
  },
};
import { useEffect } from 'react';
import { Device, useCreateDeviceMutation } from '../generatedApi';
import {
  DeviceFormFields,
  DeviceSchema,
  notifyInvalidDevice,
  toDeviceFormValues,
  toDeviceRequest,
} from './DeviceFormFields';

export const DeviceCreationModalId = 'device-creation-modal-id';
// true opens an empty form, a device pre-fills it (e.g. one found by "Scan board")
export type DeviceCreationModal = Record<typeof DeviceCreationModalId, boolean | Device>;

export function DeviceCreationModal() {
  const { state, setState } = useModal(DeviceCreationModalId);
  const [createDevice] = useCreateDeviceMutation();

  const form = useAppForm({
    defaultValues: toDeviceFormValues(null),
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

      const res = await createDevice({
        deviceRequest: toDeviceRequest(parsed.data),
      });
      if (res.data) {
        notification.success({
          message: pick(TEXTS).created(parsed.data.name),
        });
      } else {
        notification.error({
          message: pick(TEXTS).createFailed,
          description: errorMessage(res.error),
        });
        return;
      }

      form.reset();
      setState(false);
    },
  });

  useEffect(() => {
    if (state) form.reset(toDeviceFormValues(typeof state === 'object' ? state : null));
  }, [state]);

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={open => {
        if (!open) setState(false);
      }}
    >
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
            <DialogTitle>{pick(TEXTS).title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <DeviceFormFields form={form} />
          </div>
          <DialogFooter>
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
