import { NOTIFICATION_TYPES, NotificationType } from '@src/lib/api/api.types';
import z from 'zod';
import { SimpleModalState } from './modals.types';
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
import { useCreateNotificationMutation } from '../generatedApi';

export const AlertTemplateCreationModalId = 'alert-template-creation-modal-id';
export type AlertTemplateCreationModal = SimpleModalState<
  typeof AlertTemplateCreationModalId
>;

export const CreateAlertTemplateSchema = z.object({
  telegramChatId: z.string(),
  type: z.enum(NotificationType),
  template: z.string(),
});

type CreateAlert = z.infer<typeof CreateAlertTemplateSchema>;

export function AlertTemplateCreationModal() {
  const { state, setState } = useModal(AlertTemplateCreationModalId);

  const [createAlertTemplate] = useCreateNotificationMutation();

  const form = useAppForm({
    defaultValues: {
      telegramChatId: '',
      template: '',
      type: NotificationType.INFO,
    } as CreateAlert,
    validators: {
      onSubmit: CreateAlertTemplateSchema as any,
    },
    onSubmit: async ({ value }) => {
      const parsed = CreateAlertTemplateSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }

      const res = await createAlertTemplate({
        telegramNotificationRequest: value,
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
      setState(false);
    },
  });

  return (
    <Dialog open={state} onOpenChange={setState}>
      <DialogContent>
        <form
          className="contents"
          id={AlertTemplateCreationModalId}
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Create Alert Template</DialogTitle>
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
