import z from 'zod';
import { FieldGroup } from '@src/components/Field';
import type {
  NotificationChannel,
  TelegramNotification,
  TelegramNotificationRequest,
} from '../generatedApi';

export const DEFAULT_TEMPLATE = `Critical alert

Sensor {{device_name}} reported {{current_value}}
Thresholds: {{lower_value}} … {{critical_value}}
Location: {{device_location}}
Time: {{timestamp}}`;

export const NotificationSchema = z
  .object({
    channel: z.enum(['TELEGRAM', 'EMAIL']),
    telegramChatId: z.string().optional(),
    email: z.string().optional(),
    type: z.enum(['INFO', 'WARNING', 'CRITICAL']),
    template: z.string().min(1, 'Template is required'),
  })
  .superRefine((value, ctx) => {
    if (value.channel === 'TELEGRAM' && !value.telegramChatId?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['telegramChatId'], message: 'Chat id is required' });
    }
    if (value.channel === 'EMAIL' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email ?? '')) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid e-mail' });
    }
  });

export type NotificationFormValues = z.input<typeof NotificationSchema>;

export function toNotificationFormValues(
  notification?: TelegramNotification | null
): NotificationFormValues {
  return {
    channel: (notification?.channel ?? 'TELEGRAM') as NotificationChannel,
    telegramChatId: notification?.telegramChatId ?? '',
    email: notification?.email ?? '',
    type: notification?.type ?? 'CRITICAL',
    template: notification?.template ?? DEFAULT_TEMPLATE,
  };
}

export function toNotificationRequest(
  value: z.output<typeof NotificationSchema>
): TelegramNotificationRequest {
  return {
    channel: value.channel,
    telegramChatId: value.channel === 'TELEGRAM' ? value.telegramChatId?.trim() : undefined,
    email: value.channel === 'EMAIL' ? value.email?.trim() : undefined,
    type: value.type,
    template: value.template,
  };
}

// TanStack form instance created with useAppForm in the parent modal
export function NotificationFormFields({ form }: { form: any }) {
  return (
    <FieldGroup>
      <div className="flex flex-wrap gap-2">
        <form.AppField
          name="channel"
          children={(field: any) => (
            <field.SelectField
              label="Channel"
              options={[
                { value: 'TELEGRAM', label: 'Telegram' },
                { value: 'EMAIL', label: 'E-mail' },
              ]}
            />
          )}
        />
        <form.AppField
          name="type"
          children={(field: any) => (
            <field.SelectField
              label="Severity"
              options={[
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'WARNING', label: 'Warning' },
                { value: 'INFO', label: 'Info' },
              ]}
            />
          )}
        />
      </div>

      <form.Subscribe
        selector={(state: any) => state.values.channel}
        children={(channel: NotificationChannel) =>
          channel === 'EMAIL' ? (
            <form.AppField
              name="email"
              children={(field: any) => (
                <field.TextField label="E-mail" placeholder="name@example.com" />
              )}
            />
          ) : (
            <>
              <form.AppField
                name="telegramChatId"
                children={(field: any) => (
                  <field.TextField label="Telegram chat id" placeholder="392872938" />
                )}
              />
              <p className="-mt-3 text-xs text-slate-500">
                Write to the bot first, then get your chat id, e.g. from @userinfobot.
              </p>
            </>
          )
        }
      />

      <form.AppField
        name="template"
        children={(field: any) => <field.TextareaField label="Message template" />}
      />
      <p className="-mt-3 text-xs text-slate-500">
        Placeholders: {'{{device_name}}'}, {'{{current_value}}'}, {'{{lower_value}}'},{' '}
        {'{{critical_value}}'}, {'{{device_location}}'}, {'{{timestamp}}'}, {'%{username}'}
      </p>
    </FieldGroup>
  );
}
