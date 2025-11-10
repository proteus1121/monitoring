import { useEffect, useState } from 'react';
import { Button, Form, Input, Popconfirm, Select, Tooltip } from 'antd';
import { Card } from '../NotificationsPage';
import { TelegramNotification } from '@src/lib/api/api.types';

const TYPE_OPTIONS = ['INFO', 'WARNING', 'CRITICAL'];

export const NotificationCard = ({
                                     notification,
                                     onSave,
                                     onDelete,
                                 }: {
    notification: TelegramNotification;
    onSave: (updated: TelegramNotification) => void;
    onDelete: () => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(notification);

    useEffect(() => {
        setDraft(notification);
    }, [isEditing, notification]);

    const handleSave = () => {
        onSave(draft);
        setIsEditing(false);
    };

    return (
        <>
            {isEditing ? (
                <EditableNotificationCard
                    notification={draft}
                    setNotification={setDraft}
                    onEnablePreview={() => setIsEditing(false)}
                    onSave={handleSave}
                />
            ) : (
                <PreviewNotificationCard
                    notification={notification}
                    onEnableEditing={() => setIsEditing(true)}
                    onDelete={onDelete}
                />
            )}
        </>
    );
};

export const PreviewNotificationCard = ({
                                            notification,
                                            onDelete,
                                            onEnableEditing,
                                        }: {
    notification: TelegramNotification;
    onDelete: () => void;
    onEnableEditing: () => void;
}) => {
    return (
        <Card>
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <h3 className="mb-2 text-lg font-semibold">Notification #{notification.id ?? '—'}</h3>
                    <div>
                        <span className="font-medium">Telegram Chat ID:</span>{' '}
                        {notification.telegramChatId || '—'}
                    </div>
                    <div>
                        <span className="font-medium">Type:</span> {notification.type || '—'}
                    </div>
                    <div className="whitespace-pre-wrap">
                        <span className="font-medium">Template:</span>
                        <br />
                        {notification.template || '—'}
                    </div>
                    {notification.user && (
                        <div>
                            <span className="font-medium">User:</span>{' '}
                            {notification.user.username ||
                                notification.user.email ||
                                (notification.user.id ? `#${notification.user.id}` : '—')}
                        </div>
                    )}
                </div>
                <div className="ml-4 flex flex-col gap-2">
                    <Tooltip title="Edit">
                        <Button onClick={onEnableEditing} type="default">
                            Edit
                        </Button>
                    </Tooltip>
                    <Popconfirm
                        title="Delete this notification?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={onDelete}
                    >
                        <Button danger>Delete</Button>
                    </Popconfirm>
                </div>
            </div>
        </Card>
    );
};

const EditableNotificationCard = ({
                                      notification,
                                      setNotification,
                                      onEnablePreview,
                                      onSave,
                                  }: {
    notification: TelegramNotification;
    setNotification: React.Dispatch<React.SetStateAction<TelegramNotification>>;
    onEnablePreview: () => void;
    onSave: () => void;
}) => {
    return (
        <Card>
            <Form className="contents" layout="vertical" onFinish={onSave}>
                <Form.Item label="Telegram Chat ID" required>
                    <Input
                        required
                        value={notification.telegramChatId}
                        onChange={(e) =>
                            setNotification((prev) => ({ ...prev, telegramChatId: e.currentTarget.value }))
                        }
                    />
                </Form.Item>

                <Form.Item label="Type" required>
                    <Select
                        value={notification.type}
                        onChange={(val) => setNotification((prev) => ({ ...prev, type: val }))}
                        options={TYPE_OPTIONS.map((t) => ({ label: t, value: t }))}
                    />
                </Form.Item>

                <Form.Item label="Template" required>
                    <Input.TextArea
                        required
                        autoSize={{ minRows: 3, maxRows: 8 }}
                        value={notification.template}
                        onChange={(e) => setNotification((prev) => ({ ...prev, template: e.currentTarget.value }))}
                    />
                </Form.Item>

                <div className="ml-auto flex gap-2">
                    <Button onClick={onEnablePreview}>Cancel</Button>
                    <Button type="primary" htmlType="submit">
                        Save
                    </Button>
                </div>
            </Form>
        </Card>
    );
};