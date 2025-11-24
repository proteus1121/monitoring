import { useApi } from '@src/lib/api/ApiProvider';
import { useEffect, useMemo, useState } from 'react';
import {
  TelegramNotification,
  CreateTelegramNotificationRequest,
  UpdateTelegramNotificationRequest,
  NotificationType,
} from '@src/lib/api/api.types';
import { NotificationCard } from './components/NotificationCard';
import { Loader } from '@src/components/Loader';
import { PageHeader, PageHeaderTitle } from '@src/components/PageHeader';
import { notification } from 'antd';
import { Button } from '@src/components/Button';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import { PageLayout } from '@src/layouts/PageLayout';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@src/components/Select';
import { useModal } from '@src/redux/modals/modals.hook';
import { AlertTemplateCreationModalId } from '@src/redux/modals/AlertTemplateCreationModal';
import { H1, H3 } from '@src/components/Text';
import { cn } from '@src/lib/classnameUtils';
import { Switch } from '@src/components/Switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@src/components/AlertDialog';
import { AlertDialogModalId } from '@src/redux/modals/AlertDialog';

const alertTemplateDropdownOptions = [
  {
    value: 'all',
    label: 'All Templates',
  } as const,
  {
    value: NotificationType.INFO,
    label: 'Info',
  },
  {
    value: NotificationType.WARNING,
    label: 'Warning',
  },
  {
    value: NotificationType.CRITICAL,
    label: 'Critical',
  },
];

const NotificationsPage = () => {
  const api = useApi();
  const [items, setItems] = useState<Array<TelegramNotification>>([]);
  const [templateType, setTemplateType] = useState<{
    label: string;
    value: NotificationType | 'all';
  }>(alertTemplateDropdownOptions[0]);

  const filteredItems = useMemo(() => {
    if (templateType.value === 'all') return items;

    return items.filter(i => i.type === templateType.value);
  }, [items, templateType]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAlertTemplates = async () => {
    setIsLoading(true);
    const res = await api.getAlertTemplates();
    if (!res.ok) {
      notification.error({
        message: 'Failed to fetch notifications',
        description: res.message,
      });
      setIsLoading(false);
      return;
    }

    setItems(res.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAlertTemplates();
  }, [api]);

  const handleDelete = async (id: number) => {
    const res = await api.deleteNotification(id);
    if (res.ok) {
      notification.success({ message: `Deleted` });
    } else {
      notification.error({
        message: 'Failed to delete notification',
        description: res.message,
      });
    }
    await fetchAlertTemplates();
  };

  const handleUpdate = async (n: TelegramNotification) => {
    if (!n.id || !n.telegramChatId || !n.type || !n.template) {
      notification.error({
        message: 'Failed to update notification',
        description:
          'Notification must include id, telegramChatId, type, and template',
      });
      return;
    }
    const payload: UpdateTelegramNotificationRequest = {
      id: n.id,
      telegramChatId: n.telegramChatId,
      type: n.type,
      template: n.template,
    };
    const res = await api.updateNotification(payload);
    if (res.ok) {
      notification.success({
        message: `Notification #${n.id} updated successfully`,
      });
    } else {
      notification.error({
        message: 'Failed to update notification',
        description: res.message,
      });
    }
    await fetchAlertTemplates();
  };

  const { setState } = useModal(AlertTemplateCreationModalId);
  const { setState: deletionModal } = useModal(AlertDialogModalId);

  if (isLoading && !items) {
    return <Loader />;
  }

  return (
    <>
      <PageLayout>
        <PageHeader>
          <div>
            <PageHeaderTitle>
              <H1>Alert Settings</H1>
            </PageHeaderTitle>
            <H3>Configure alert templates and notification channels</H3>
          </div>

          <Button onClick={() => setState(true)} className="ml-2 shrink-0">
            <Icon icon="lucide:plus" className="size-4" />
            Add Template
          </Button>
        </PageHeader>

        <Card>
          <div className="flex items-center justify-between pb-6 text-xl font-semibold">
            Alert Templates
            <Select
              defaultValue="all"
              onValueChange={val => {
                const templateType = alertTemplateDropdownOptions.find(
                  i => i.value === val
                );

                setTemplateType(
                  templateType ?? alertTemplateDropdownOptions[0]
                );
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {alertTemplateDropdownOptions.map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {filteredItems.map(i => (
            <Card className="flex" key={i.id}>
              <div className="flex flex-1 items-center gap-4">
                <div
                  className={cn('rounded-lg bg-current/20 p-3', {
                    'text-red-500': i.type === NotificationType.CRITICAL,
                    'text-blue-500': i.type === NotificationType.INFO,
                    'text-yellow-500': i.type === NotificationType.WARNING,
                  })}
                >
                  <Icon icon="lucide:bell" className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h4 className="font-medium">Alert Template Title</h4>{' '}
                    {/* // TODO: ADD ACTUAL TITLES */}
                    <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/40 bg-current/20 px-2 py-0.5 text-xs text-red-700">
                      <Icon icon="lucide:triangle-alert" className="size-3" />
                      Critical
                    </span>
                    <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/40 bg-current/20 px-2 py-0.5 text-xs text-green-700">
                      Enabled
                    </span>
                  </div>
                  <div className="mr-10 mb-2 line-clamp-1 text-sm text-gray-600">
                    {i.template}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/5 bg-current/5 px-2 py-0.5 text-xs">
                      <Icon icon="lucide:mail" />
                      Email
                    </span>
                    <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/5 bg-current/5 px-2 py-0.5 text-xs">
                      <Icon icon="lucide:message-square" />
                      Telegram
                    </span>
                    <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/5 bg-current/5 px-2 py-0.5 text-xs">
                      <Icon icon="lucide:smartphone" />
                      Sms
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch />
                <Button variant="ghost" size="icon">
                  <Icon icon="lucide:edit" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    deletionModal({
                      callback: () => handleDelete(i.id),
                    });
                  }}
                >
                  <Icon icon="lucide:trash-2" />
                </Button>
              </div>
            </Card>
            // <NotificationCard
            //   key={n.id ?? idx}
            //   notification={n}
            //   onSave={handleUpdate}
            //   onDelete={() => {
            //     if (!n.id) {
            //       notification.error({
            //         message: 'Failed to delete notification',
            //         description: 'Notification should have id',
            //       });
            //       return;
            //     }
            //     const label = n.telegramChatId
            //       ? ` chat ${n.telegramChatId}`
            //       : '';
            //     handleDelete(n.id, label);
            //   }}
            // />
          ))}
        </Card>
      </PageLayout>
    </>
  );
};

export default NotificationsPage;
