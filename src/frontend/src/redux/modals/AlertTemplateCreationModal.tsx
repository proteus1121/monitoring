import { useEffect } from 'react';
import { notification } from 'antd';
import { SimpleModalState } from './modals.types';
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
import { useCreateNotificationMutation } from '../generatedApi';
import {
  NotificationFormFields,
  NotificationSchema,
  toNotificationFormValues,
  toNotificationRequest,
} from './NotificationFormFields';

export const AlertTemplateCreationModalId = 'alert-template-creation-modal-id';
export type AlertTemplateCreationModal = SimpleModalState<
  typeof AlertTemplateCreationModalId
>;

export function AlertTemplateCreationModal() {
  const { state, setState } = useModal(AlertTemplateCreationModalId);
  const [createNotification] = useCreateNotificationMutation();

  const form = useAppForm({
    defaultValues: toNotificationFormValues(),
    validators: { onSubmit: NotificationSchema as any },
    onSubmit: async ({ value }) => {
      const parsed = NotificationSchema.safeParse(value);
      if (!parsed.success) return;

      const res = await createNotification({
        telegramNotificationRequest: toNotificationRequest(parsed.data),
      });
      if (res.data) {
        notification.success({ message: 'Notification added' });
        setState(false);
      } else {
        notification.error({
          message: 'Failed to add notification',
          description: JSON.stringify(res.error),
        });
      }
    },
  });

  useEffect(() => {
    if (state) form.reset(toNotificationFormValues());
  }, [state]);

  return (
    <Dialog open={state} onOpenChange={setState}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <form
          className="contents"
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Add notification</DialogTitle>
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
