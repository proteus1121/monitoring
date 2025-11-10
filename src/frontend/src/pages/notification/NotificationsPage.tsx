import { useApi } from '@src/lib/api/ApiProvider';
import { ReactNode, useEffect, useState } from 'react';
import { Button, Form, Input, Select, notification } from 'antd';
import { Icon } from '@iconify/react';
import clsx from 'clsx';
import {
    TelegramNotification,
    CreateTelegramNotificationRequest,
    UpdateTelegramNotificationRequest,
} from '@src/lib/api/api.types';
import { NotificationCard } from './components/NotificationCard';

// Reuse same “Card” component pattern from DevicesPage for consistent look.
export const Card = (props: { children: ReactNode; className?: string; onClick?: () => void }) => {
    return (
        <div
            className={clsx(
                'mx-auto mt-6 w-[350px] max-w-[36rem] rounded-xl bg-white p-4 shadow-xl last:mb-6 sm:w-full',
                props.className
            )}
            onClick={props.onClick}
        >
            {props.children}
        </div>
    );
};

const TYPE_OPTIONS = ['INFO', 'ALERT', 'WARNING', 'CRITICAL'];

const NotificationsPage = () => {
    const api = useApi();
    const [items, setItems] = useState<Array<TelegramNotification> | undefined>(undefined);

    const fetchNotifications = async () => {
        const res = await api.getNotifications();
        if (!res.ok) {
            notification.error({
                message: 'Failed to fetch notifications',
                description: res.message,
            });
            return;
        }
        setItems(res.data);
    };

    useEffect(() => {
        fetchNotifications();
    }, [api]);

    const handleDelete = async (id: number, label?: string) => {
        const res = await api.deleteNotification(id);
        if (res.ok) {
            notification.success({ message: `Deleted${label ? ` ${label}` : ''}` });
        } else {
            notification.error({ message: 'Failed to delete notification', description: res.message });
        }
        await fetchNotifications();
    };

    const handleUpdate = async (n: TelegramNotification) => {
        if (!n.id || !n.telegramChatId || !n.type || !n.template) {
            notification.error({
                message: 'Failed to update notification',
                description: 'Notification must include id, telegramChatId, type, and template',
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
            notification.success({ message: `Notification #${n.id} updated successfully` });
        } else {
            notification.error({ message: 'Failed to update notification', description: res.message });
        }
        await fetchNotifications();
    };

    const [isCreationVisible, setIsCreationVisible] = useState<boolean>(false);

    const handleCreate = async (req: CreateTelegramNotificationRequest) => {
        const res = await api.createNotification(req);
        if (res.ok) {
            notification.success({ message: 'Notification created successfully' });
        } else {
            notification.error({ message: 'Failed to create notification', description: res.message });
        }
        setIsCreationVisible(false);
        await fetchNotifications();
    };

    return (
        <>
            {isCreationVisible ? (
                <NotificationCreationForm
                    onCreate={handleCreate}
                    setIsCreationVisible={setIsCreationVisible}
                />
            ) : (
                <Card
                    onClick={() => {
                        setIsCreationVisible(true);
                    }}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-green-400 !bg-green-100 text-xl text-green-400 !shadow-none"
                >
                    <Icon icon="ic:round-add-circle-outline" className="size-8" />
                    Add notification
                </Card>
            )}

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
                            const label = n.telegramChatId ? ` chat ${n.telegramChatId}` : '';
                            handleDelete(n.id, label);
                        }}
                    />
                ))}
        </>
    );
};

export default NotificationsPage;

const NotificationCreationForm = ({
                                      onCreate,
                                      setIsCreationVisible,
                                  }: {
    onCreate: (req: CreateTelegramNotificationRequest) => void;
    setIsCreationVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const [formState, setFormState] = useState<CreateTelegramNotificationRequest>({
        telegramChatId: '',
        type: TYPE_OPTIONS[0],
        template: '',
    });

    const handleCreate = () => {
        const { telegramChatId, type, template } = formState;
        if (!telegramChatId || !type || !template) {
            notification.error({
                message: 'Missing fields',
                description: 'telegramChatId, type, and template are required',
            });
            return;
        }
        onCreate(formState);
    };

    return (
        <Card>
            <Form className="contents" layout="vertical" onFinish={handleCreate}>
                <Form.Item label="Telegram Chat ID" required>
                    <Input
                        required
                        value={formState.telegramChatId}
                        onChange={(e) =>
                            setFormState((prev) => ({ ...prev, telegramChatId: e.currentTarget.value }))
                        }
                    />
                </Form.Item>

                <Form.Item label="Type" required>
                    <Select
                        value={formState.type}
                        onChange={(val) => setFormState((prev) => ({ ...prev, type: val }))}
                        options={TYPE_OPTIONS.map((t) => ({ label: t, value: t }))}
                    />
                </Form.Item>

                <Form.Item label="Template" required>
                    <Input.TextArea
                        required
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        value={formState.template}
                        onChange={(e) => setFormState((prev) => ({ ...prev, template: e.currentTarget.value }))}
                    />
                </Form.Item>

                <div className="ml-auto flex gap-2">
                    <Button
                        onClick={() => {
                            setIsCreationVisible(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <Button type="primary" htmlType="submit">
                        Create
                    </Button>
                </div>
            </Form>
        </Card>
    );
};