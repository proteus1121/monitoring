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
import { pick } from '@src/lib/lang';

const TEXTS = {
  uk: { added: 'Отримувача додано', failed: 'Не вдалося додати отримувача', title: 'Новий отримувач', cancel: 'Скасувати', save: 'Зберегти' },
  en: { added: 'Notification added', failed: 'Failed to add notification', title: 'Add notification', cancel: 'Cancel', save: 'Save' },
};
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
        notification.success({ message: pick(TEXTS).added });
        setState(false);
      } else {
        notification.error({
          message: pick(TEXTS).failed,
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
