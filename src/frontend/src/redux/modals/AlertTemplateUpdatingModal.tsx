import { useEffect } from 'react';
import { notification } from 'antd';
import { ModalState } from './modals.types';
import { useModal } from './modals.hook';
import { useAppForm } from '@src/components/Form';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/Dialog';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import {
  TelegramNotification,
  useUpdateNotificationMutation,
} from '../generatedApi';
import {
  NotificationFormFields,
  NotificationSchema,
  toNotificationFormValues,
  toNotificationRequest,
} from './NotificationFormFields';

export const AlertTemplateUpdatingModalId = 'alert-template-updating-modal-id';
export type AlertTemplateUpdatingModal = ModalState<
  typeof AlertTemplateUpdatingModalId,
  TelegramNotification
>;

export function AlertTemplateUpdatingModal() {
  const { state, setState } = useModal(AlertTemplateUpdatingModalId);
  const [updateNotification] = useUpdateNotificationMutation();

  const form = useAppForm({
    defaultValues: toNotificationFormValues(state),
    validators: { onSubmit: NotificationSchema as any },
    onSubmit: async ({ value }) => {
      const parsed = NotificationSchema.safeParse(value);
      if (!parsed.success || !state?.id) return;

      const res = await updateNotification({
        id: state.id,
        telegramNotificationRequest: toNotificationRequest(parsed.data),
      });
      if (res.data) {
        notification.success({ message: 'Notification updated' });
        setState(null);
      } else {
        notification.error({
          message: 'Failed to update notification',
          description: JSON.stringify(res.error),
        });
      }
    },
  });

  useEffect(() => {
    form.reset(toNotificationFormValues(state));
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
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit notification</DialogTitle>
          </DialogHeader>
          <NotificationFormFields form={form} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <form.Subscribe
              selector={s => [s.canSubmit, s.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting && <Spinner />}
                  Save
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
