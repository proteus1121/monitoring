import { Icon } from '@iconify/react';
import { notification } from 'antd';
import clsx from 'clsx';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Loader } from '@src/components/Loader';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { useModal } from '@src/redux/modals/modals.hook';
import { AlertTemplateCreationModalId } from '@src/redux/modals/AlertTemplateCreationModal';
import { AlertTemplateUpdatingModalId } from '@src/redux/modals/AlertTemplateUpdatingModal';
import { AppAlertDialogModalId } from '@src/redux/modals/AlertDialog';
import {
  TelegramNotification,
  useDeleteNotificationMutation,
  useGetNotificationChannelsQuery,
  useGetNotificationsQuery,
  useTestNotificationMutation,
} from '@src/redux/generatedApi';
import { useTexts } from '@src/lib/lang';

const TEXTS = {
  uk: {
    title: 'Сповіщення',
    description: 'Куди надходять сповіщення. Пороги задаються для кожного пристрою на сторінці «Мої пристрої».',
    add: 'Додати отримувача',
    none: 'Отримувачів ще немає — додайте чат Telegram або адресу e-mail.',
    checking: 'Перевірка…',
    configured: 'Налаштовано на сервері',
    noEmail: 'Не налаштовано: задайте секрети MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD',
    noTelegram: 'Не налаштовано: задайте секрет TELEGRAM_BOT_TOKEN',
    testFailed: 'Не вдалося надіслати тестове повідомлення',
    testSent: (channel: string) => `Тестове повідомлення надіслано через ${channel}`,
    chat: 'Чат',
    test: 'Тест',
    edit: 'Редагувати',
    delete: 'Видалити',
    deleteConfirm: 'Видалити цього отримувача?',
  },
  en: {
    title: 'Alerts',
    description: 'Where alerts are delivered. Thresholds are set per device on the My devices page.',
    add: 'Add notification',
    none: 'No notifications yet — add a Telegram chat or an e-mail address.',
    checking: 'Checking…',
    configured: 'Configured on the server',
    noEmail: 'Not configured: set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD secrets',
    noTelegram: 'Not configured: set TELEGRAM_BOT_TOKEN secret',
    testFailed: 'Test message failed',
    testSent: (channel: string) => `Test message sent via ${channel}`,
    chat: 'Chat',
    test: 'Test',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Delete this notification?',
  },
};

const CHANNELS = {
  TELEGRAM: { label: 'Telegram', icon: 'logos:telegram' },
  EMAIL: { label: 'E-mail', icon: 'lucide:mail' },
} as const;

const AlertsPage = () => {
  const { data: notifications, isLoading } = useGetNotificationsQuery();
  const { data: channels } = useGetNotificationChannelsQuery();
  const { setState: openCreation } = useModal(AlertTemplateCreationModalId);
  const t = useTexts(TEXTS);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>{t.title}</PageHeaderTitle>
          <PageHeaderDescription>{t.description}</PageHeaderDescription>
        </div>
        <Button onClick={() => openCreation(true)} className="ml-2 shrink-0">
          <Icon icon="lucide:plus" className="size-4" />
          {t.add}
        </Button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(CHANNELS) as (keyof typeof CHANNELS)[]).map(channel => (
          <ChannelStatus key={channel} channel={channel} enabled={channels?.[channel]} />
        ))}
      </div>

      {notifications?.length ? (
        <div className="space-y-3">
          {notifications.map(item => (
            <NotificationCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center gap-2 py-10 text-sm text-slate-500">
          <Icon icon="lucide:bell-off" className="size-6" />
          {t.none}
        </Card>
      )}
    </PageLayout>
  );
};

export default AlertsPage;

function ChannelStatus(props: { channel: keyof typeof CHANNELS; enabled?: boolean }) {
  const { label, icon } = CHANNELS[props.channel];
  const t = useTexts(TEXTS);
  return (
    <Card className="flex items-center gap-3 text-sm">
      <Icon icon={icon} className="size-5 text-slate-600" />
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-slate-500">
          {props.enabled === undefined
            ? t.checking
            : props.enabled
              ? t.configured
              : props.channel === 'EMAIL'
                ? t.noEmail
                : t.noTelegram}
        </div>
      </div>
      <span
        className={clsx(
          'size-2.5 rounded-full',
          props.enabled ? 'bg-green-500' : 'bg-gray-300'
        )}
      />
    </Card>
  );
}

function NotificationCard({ item }: { item: TelegramNotification }) {
  const channel = CHANNELS[item.channel ?? 'TELEGRAM'];
  const { setState: edit } = useModal(AlertTemplateUpdatingModalId);
  const { setState: confirm } = useModal(AppAlertDialogModalId);
  const [deleteNotification] = useDeleteNotificationMutation();
  const [testNotification, { isLoading: isTesting }] = useTestNotificationMutation();
  const t = useTexts(TEXTS);

  const test = async () => {
    const res = await testNotification({ id: item.id! });
    if ('error' in res) {
      notification.error({
        message: t.testFailed,
        description: JSON.stringify(res.error),
      });
    } else {
      notification.success({ message: t.testSent(channel.label) });
    }
  };

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 gap-3">
        <Icon icon={channel.icon} className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {item.channel === 'EMAIL' ? item.email : `${t.chat} ${item.telegramChatId}`}
            </span>
          </div>
          <pre className="mt-2 max-h-28 overflow-hidden font-sans text-xs whitespace-pre-wrap text-slate-500">
            {item.template}
          </pre>
        </div>
      </div>
      <div className="flex shrink-0 gap-1 self-end sm:self-start">
        <Button size="sm" variant="secondary" disabled={isTesting} onClick={test}>
          <Icon icon="lucide:send" />
          {t.test}
        </Button>
        <Button size="icon" variant="ghost" title={t.edit} onClick={() => edit(item)}>
          <Icon icon="lucide:edit" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title={t.delete}
          onClick={() =>
            confirm({
              description: t.deleteConfirm,
              callback: async () => {
                await deleteNotification({ id: item.id! });
              },
            })
          }
        >
          <Icon icon="lucide:trash-2" />
        </Button>
      </div>
    </Card>
  );
}
