import { useEffect } from 'react';
import { pick } from '@src/lib/lang';

const TEXTS = {
  uk: { updated: 'Отримувача збережено', failed: 'Не вдалося зберегти отримувача', title: 'Редагування отримувача', cancel: 'Скасувати', save: 'Зберегти' },
  en: { updated: 'Notification updated', failed: 'Failed to update notification', title: 'Edit notification', cancel: 'Cancel', save: 'Save' },
};
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
        notification.success({ message: pick(TEXTS).updated });
        setState(null);
      } else {
        notification.error({
          message: pick(TEXTS).failed,
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
            <DialogTitle>{pick(TEXTS).title}</DialogTitle>
          </DialogHeader>
          <NotificationFormFields form={form} />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">{pick(TEXTS).cancel}</Button>
            </DialogClose>
            <form.Subscribe
              selector={s => [s.canSubmit, s.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting && <Spinner />}
                  {pick(TEXTS).save}
                </Button>
              )}
            />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
