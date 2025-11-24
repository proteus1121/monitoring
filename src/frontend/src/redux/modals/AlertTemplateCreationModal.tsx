import {
  CreateTelegramNotificationRequest,
  NOTIFICATION_TYPES,
  NotificationType,
} from '@src/lib/api/api.types';
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
//
// const NotificationCreationForm = ({
//   onCreate,
//   setIsCreationVisible,
// }: {
//   onCreate: (req: CreateTelegramNotificationRequest) => void;
//   setIsCreationVisible: React.Dispatch<React.SetStateAction<boolean>>;
// }) => {
//   const [formState, setFormState] = useState<CreateTelegramNotificationRequest>(
//     {
//       telegramChatId: '',
//       type: TYPE_OPTIONS[0],
//       template: '',
//     }
//   );
//
//   const handleCreate = () => {
//     const { telegramChatId, type, template } = formState;
//     if (!telegramChatId || !type || !template) {
//       notification.error({
//         message: 'Missing fields',
//         description: 'telegramChatId, type, and template are required',
//       });
//       return;
//     }
//     onCreate(formState);
//   };
//
//   return (
//     <Card>
//       <Form className="contents" layout="vertical" onFinish={handleCreate}>
//         <Form.Item label="Telegram Chat ID" required>
//           <Input
//             required
//             value={formState.telegramChatId}
//             onChange={e =>
//               setFormState(prev => ({
//                 ...prev,
//                 telegramChatId: e.currentTarget.value,
//               }))
//             }
//           />
//         </Form.Item>
//
//         <Form.Item label="Type" required>
//           <Select
//             value={formState.type}
//             onChange={val => setFormState(prev => ({ ...prev, type: val }))}
//             options={TYPE_OPTIONS.map(t => ({ label: t, value: t }))}
//           />
//         </Form.Item>
//
//         <Form.Item label="Template" required>
//           <Input.TextArea
//             required
//             autoSize={{ minRows: 3, maxRows: 8 }}
//             value={formState.template}
//             onChange={e =>
//               setFormState(prev => ({
//                 ...prev,
//                 template: e.currentTarget.value,
//               }))
//             }
//           />
//         </Form.Item>
//
//         <div className="ml-auto flex gap-2">
//           <Button
//             onClick={() => {
//               setIsCreationVisible(false);
//             }}
//           >
//             Cancel
//           </Button>
//           <Button type="primary" htmlType="submit">
//             Create
//           </Button>
//         </div>
//       </Form>
//     </Card>
//   );
// };

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
  const api = useApi();

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

      const res = await api.createAlertTemplate(value);
      if (res.ok) {
        notification.success({
          message: `alert template for chatId:${value.telegramChatId} created succesfully`,
        });
      } else {
        notification.error({
          message: 'Failed to create alert template',
          description: res.message,
        });
      }

      form.reset();
      setState(false);

      //HACK : workaround because we do not have query caching yet, so alerts wouldn't be refetched
      // TODO: remove when react-query will be used
      window.location.reload();
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
