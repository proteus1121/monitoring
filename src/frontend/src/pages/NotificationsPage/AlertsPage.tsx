import { useApi } from '@src/lib/api/ApiProvider';
import { useEffect, useState } from 'react';
import {
  TelegramNotification,
  CreateTelegramNotificationRequest,
  UpdateTelegramNotificationRequest,
} from '@src/lib/api/api.types';
import { NotificationCard } from './components/NotificationCard';
import { Loader } from '@src/components/Loader';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
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

const TYPE_OPTIONS = ['INFO', 'WARNING', 'CRITICAL'];

const NotificationsPage = () => {
  const api = useApi();
  const [items, setItems] = useState<Array<TelegramNotification> | undefined>(
    undefined
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    const res = await api.getNotifications();
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
    fetchNotifications();
  }, [api]);

  const handleDelete = async (id: number, label?: string) => {
    const res = await api.deleteNotification(id);
    if (res.ok) {
      notification.success({ message: `Deleted${label ? ` ${label}` : ''}` });
    } else {
      notification.error({
        message: 'Failed to delete notification',
        description: res.message,
      });
    }
    await fetchNotifications();
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
    await fetchNotifications();
  };

  const [isCreationVisible, setIsCreationVisible] = useState<boolean>(false);

  const handleCreate = async (req: CreateTelegramNotificationRequest) => {
    //TODO: loader for creation
    const res = await api.createAlertTemplate(req);
    if (res.ok) {
      notification.success({ message: 'Notification created successfully' });
    } else {
      notification.error({
        message: 'Failed to create notification',
        description: res.message,
      });
    }
    setIsCreationVisible(false);
    await fetchNotifications();
  };

  const { setState } = useModal(AlertTemplateCreationModalId);

  if (isLoading && !items) {
    return <Loader />;
  }

  return (
    <>
      <PageLayout>
        <PageHeader>
          <div>
            <PageHeaderTitle>Alert Settings</PageHeaderTitle>
            <PageHeaderDescription>
              Configure alert templates and notification channels
            </PageHeaderDescription>
          </div>

          <Button
            variant="primary"
            onClick={() => setState(true)}
            className="ml-2 shrink-0"
          >
            <Icon icon="lucide:plus" className="mr-2 size-4" />
            Add Template
          </Button>
        </PageHeader>

        <Card>
          <div className="flex items-center justify-between pb-6 text-xl font-semibold">
            Alert Templates
            <Select defaultValue="aboba">
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {[{ label: 'Aboba', value: 'aboba' }].map((option, index) => (
                    <SelectItem key={index} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {items &&
            items.map((n, idx) => (
              <NotificationCard
                key={n.id ?? idx}
                notification={n}
                onSave={handleUpdate}
                onDelete={() => {
                  if (!n.id) {
                    notification.error({
                      message: 'Failed to delete notification',
                      description: 'Notification should have id',
                    });
                    return;
                  }
                  const label = n.telegramChatId
                    ? ` chat ${n.telegramChatId}`
                    : '';
                  handleDelete(n.id, label);
                }}
              />
            ))}
        </Card>
      </PageLayout>
    </>
  );
};

export default NotificationsPage;
