import {
  NOTIFICATION_TYPES,
  NotificationType,
  TelegramNotification,
} from '@src/lib/api/api.types';
import z from 'zod';
import { ModalState } from './modals.types';
import { useModal } from './modals.hook';
import { useApi } from '@src/lib/api/ApiProvider';
import { useAppForm } from '@src/components/Form';
import { notification } from 'antd';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/Dialog';
import { FieldGroup } from '@src/components/Field';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import { useUpdateNotificationMutation } from '../generatedApi';

export const AlertTemplateUpdatingModalId = 'alert-template-updating-modal-id';
export type AlertTemplateUpdatingModal = ModalState<
  typeof AlertTemplateUpdatingModalId,
  TelegramNotification
>;

export const UpdateAlertTemplateSchema = z.object({
  telegramChatId: z.string(),
  type: z.enum(NotificationType),
  template: z.string(),
});

type CreateAlert = z.infer<typeof UpdateAlertTemplateSchema>;

export function AlertTemplateUpdatingModal() {
  const { state, setState } = useModal(AlertTemplateUpdatingModalId);
  const [updateNotification] = useUpdateNotificationMutation();

  const form = useAppForm({
    defaultValues: {
      telegramChatId: state?.telegramChatId,
      template: state?.template,
      type: state?.type,
    } as CreateAlert,
    validators: {
      onSubmit: UpdateAlertTemplateSchema as any,
    },
    onSubmit: async ({ value }) => {
      const parsed = UpdateAlertTemplateSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }
      if (!state) {
        return;
      }

      const res = await updateNotification({
        telegramNotificationRequest: parsed.data,
        id: state.id,
      });
      if (res.data) {
        notification.success({
          message: `alert template for chatId:${value.telegramChatId} created succesfully`,
        });
      } else {
        notification.error({
          message: 'Failed to create alert template',
          description: JSON.stringify(res.error),
        });
      }

      form.reset();
      setState(null);
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
          id={AlertTemplateUpdatingModalId}
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Update Alert Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <FieldGroup>
              <form.AppField
                name="telegramChatId"
                children={field => (
                  <field.TextField
                    label="Telegram chat id"
                    placeholder="00000"
                  />
                )}
              />

              <form.AppField
                name="template"
                children={field => (
                  <field.TextareaField
                    label="Template"
                    placeholder={`🚨 Critical Incident Notification

Dear %{username}, 
Your sensor **{{device_name}}** has reported a critical value`}
                  />
                )}
              />

              <form.AppField
                name="type"
                children={field => (
                  <field.SelectField
                    label="Critical value"
                    options={NOTIFICATION_TYPES.map(i => ({
                      label: i,
                      value: i,
                    }))}
                  />
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
