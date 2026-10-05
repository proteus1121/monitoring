import z from 'zod';
import { FieldGroup } from '@src/components/Field';
import { pick, useTexts } from '@src/lib/lang';
import type {
  NotificationChannel,
  TelegramNotification,
  TelegramNotificationRequest,
} from '../generatedApi';

const TEXTS = {
  uk: {
    template: `Критичне сповіщення

Датчик {{device_name}} показав {{current_value}}
Пороги: {{lower_value}} … {{critical_value}}
Час: {{timestamp}}

{{description}}`,
    templateRequired: 'Потрібен шаблон',
    chatRequired: 'Потрібен id чату',
    validEmail: 'Введіть правильну адресу e-mail',
    channel: 'Канал',
    severity: 'Рівень',
    critical: 'Критичні',
    warning: 'Попередження',
    info: 'Інформація',
    chatId: 'id чату Telegram',
    chatHelp: 'Спершу напишіть боту, потім дізнайтеся свій id чату, наприклад через @userinfobot.',
    messageTemplate: 'Шаблон повідомлення',
    placeholders: 'Підстановки:',
    aiNote: 'пояснення від AI (додається в кінці, якщо підстановки немає)',
  },
  en: {
    template: `Critical alert

Sensor {{device_name}} reported {{current_value}}
Thresholds: {{lower_value}} … {{critical_value}}
Time: {{timestamp}}

{{description}}`,
    templateRequired: 'Template is required',
    chatRequired: 'Chat id is required',
    validEmail: 'Enter a valid e-mail',
    channel: 'Channel',
    severity: 'Severity',
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
    chatId: 'Telegram chat id',
    chatHelp: 'Write to the bot first, then get your chat id, e.g. from @userinfobot.',
    messageTemplate: 'Message template',
    placeholders: 'Placeholders:',
    aiNote: 'explanation written by the AI (added at the end when the placeholder is missing)',
  },
};

export const NotificationSchema = z
  .object({
    channel: z.enum(['TELEGRAM', 'EMAIL']),
    telegramChatId: z.string().optional(),
    email: z.string().optional(),
    type: z.enum(['INFO', 'WARNING', 'CRITICAL']),
    template: z.string().min(1, { error: () => pick(TEXTS).templateRequired }),
  })
  .superRefine((value, ctx) => {
    if (value.channel === 'TELEGRAM' && !value.telegramChatId?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['telegramChatId'], message: pick(TEXTS).chatRequired });
    }
    if (value.channel === 'EMAIL' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.email ?? '')) {
      ctx.addIssue({ code: 'custom', path: ['email'], message: pick(TEXTS).validEmail });
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
    // a new one starts from the template in the interface language
    template: notification?.template ?? pick(TEXTS).template,
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
  const t = useTexts(TEXTS);
  return (
    <FieldGroup>
      <div className="flex flex-wrap gap-2">
        <form.AppField
          name="channel"
          children={(field: any) => (
            <field.SelectField
              label={t.channel}
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
              label={t.severity}
              options={[
                { value: 'CRITICAL', label: t.critical },
                { value: 'WARNING', label: t.warning },
                { value: 'INFO', label: t.info },
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
                  <field.TextField label={t.chatId} placeholder="000000000" />
                )}
              />
              <p className="-mt-3 text-xs text-slate-500">{t.chatHelp}</p>
            </>
          )
        }
      />

      <form.AppField
        name="template"
        children={(field: any) => <field.TextareaField label={t.messageTemplate} />}
      />
      <p className="-mt-3 text-xs text-slate-500">
        {t.placeholders} {'{{device_name}}'}, {'{{current_value}}'}, {'{{lower_value}}'},{' '}
        {'{{critical_value}}'}, {'{{device_location}}'}, {'{{timestamp}}'}, {'%{username}'},{' '}
        {'{{description}}'} — {t.aiNote}
      </p>
    </FieldGroup>
  );
}
