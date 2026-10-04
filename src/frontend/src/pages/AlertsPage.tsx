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

const CHANNELS = {
  TELEGRAM: { label: 'Telegram', icon: 'logos:telegram' },
  EMAIL: { label: 'E-mail', icon: 'lucide:mail' },
} as const;

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  WARNING: 'bg-orange-50 text-orange-700 border-orange-200',
  INFO: 'bg-blue-50 text-blue-700 border-blue-200',
};

const AlertsPage = () => {
  const { data: notifications, isLoading } = useGetNotificationsQuery();
  const { data: channels } = useGetNotificationChannelsQuery();
  const { setState: openCreation } = useModal(AlertTemplateCreationModalId);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>Alerts</PageHeaderTitle>
          <PageHeaderDescription>
            Where alerts are delivered. Thresholds are set per device on the My devices page.
          </PageHeaderDescription>
        </div>
        <Button onClick={() => openCreation(true)} className="ml-2 shrink-0">
          <Icon icon="lucide:plus" className="size-4" />
          Add notification
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
          No notifications yet — add a Telegram chat or an e-mail address.
        </Card>
      )}
    </PageLayout>
  );
};

export default AlertsPage;

function ChannelStatus(props: { channel: keyof typeof CHANNELS; enabled?: boolean }) {
  const { label, icon } = CHANNELS[props.channel];
  return (
    <Card className="flex items-center gap-3 text-sm">
      <Icon icon={icon} className="size-5 text-slate-600" />
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs text-slate-500">
          {props.enabled === undefined
            ? 'Checking…'
            : props.enabled
              ? 'Configured on the server'
              : props.channel === 'EMAIL'
                ? 'Not configured: set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD secrets'
                : 'Not configured: set TELEGRAM_BOT_TOKEN secret'}
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

  const test = async () => {
    const res = await testNotification({ id: item.id! });
    if ('error' in res) {
      notification.error({
        message: 'Test message failed',
        description: JSON.stringify(res.error),
      });
    } else {
      notification.success({ message: `Test message sent via ${channel.label}` });
    }
  };

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 gap-3">
        <Icon icon={channel.icon} className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {item.channel === 'EMAIL' ? item.email : `Chat ${item.telegramChatId}`}
            </span>
            <span
              className={clsx(
                'rounded-full border px-2 text-xs',
                SEVERITY_STYLE[item.type ?? 'INFO']
              )}
            >
              {item.type}
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
          Test
        </Button>
        <Button size="icon" variant="ghost" title="Edit" onClick={() => edit(item)}>
          <Icon icon="lucide:edit" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Delete"
          onClick={() =>
            confirm({
              description: 'Delete this notification?',
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
