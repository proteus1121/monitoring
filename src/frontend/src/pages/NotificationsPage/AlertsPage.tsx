import { useApi } from '@src/lib/api/ApiProvider';
import { useEffect, useMemo, useState } from 'react';
import {
  TelegramNotification,
  UpdateTelegramNotificationRequest,
  NotificationType,
} from '@src/lib/api/api.types';
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
  SelectTrigger,
  SelectValue,
} from '@src/components/Select';
import { useModal } from '@src/redux/modals/modals.hook';
import { AlertTemplateCreationModalId } from '@src/redux/modals/AlertTemplateCreationModal';
import { H1, H3 } from '@src/components/Text';
import { cn } from '@src/lib/classnameUtils';
import { AlertDialogModalId } from '@src/redux/modals/AlertDialog';
import { AlertTemplateUpdatingModalId } from '@src/redux/modals/AlertTemplateUpdatingModal';

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
  const { setState: editModal } = useModal(AlertTemplateUpdatingModalId);

  if (isLoading && !items) {
    return <Loader />;
  }

  return (
    <>
      <PageLayout className="space-y-4">
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

        <Card className="space-y-4">
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
                    {/* <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/40 bg-current/20 px-2 py-0.5 text-xs text-red-700"> */}
                    {/*   <Icon icon="lucide:triangle-alert" className="size-3" /> */}
                    {/*   Critical */}
                    {/* </span> */}
                    {/* <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/40 bg-current/20 px-2 py-0.5 text-xs text-green-700"> */}
                    {/*   Enabled */}
                    {/* </span> */}
                  </div>
                  <div className="mr-10 mb-2 line-clamp-1 text-sm text-gray-600">
                    {i.template}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/5 bg-current/5 px-2 py-0.5 text-xs"> */}
                    {/*   <Icon icon="lucide:mail" /> */}
                    {/*   Email */}
                    {/* </span> */}
                    {/* <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/5 bg-current/5 px-2 py-0.5 text-xs"> */}
                    {/*   <Icon icon="lucide:message-square" /> */}
                    {/*   Telegram */}
                    {/* </span> */}
                    {/* <span className="inline-flex items-center justify-center gap-1 rounded-2xl border border-current/5 bg-current/5 px-2 py-0.5 text-xs"> */}
                    {/*   <Icon icon="lucide:smartphone" /> */}
                    {/*   Sms */}
                    {/* </span> */}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => editModal(i)}
                >
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
          ))}
        </Card>

        <Card className="pointer-events-none opacity-50">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-mail h-5 w-5"
                aria-hidden="true"
              >
                <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Email Configuration</h3>
              <p className="text-sm text-gray-500">
                Configure email notification settings
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label
                data-slot="label"
                className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                Primary Email
              </label>
              <input
                type="email"
                data-slot="input"
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                id="emailAddress"
                placeholder="your@email.com"
                value="john.doe@example.com"
              />
            </div>
            <div className="space-y-2">
              <label
                data-slot="label"
                className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                CC Email (Optional)
              </label>
              <input
                type="email"
                data-slot="input"
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                id="ccEmail"
                placeholder="additional@email.com"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">
                  Receive alerts via email
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="true"
                data-state="checked"
                value="on"
                data-slot="switch"
                className="peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  data-state="checked"
                  data-slot="switch-thumb"
                  className="bg-card dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
                ></span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Daily Digest</p>
                <p className="text-sm text-gray-500">
                  Receive daily summary of alerts
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="true"
                data-state="checked"
                value="on"
                data-slot="switch"
                className="peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  data-state="checked"
                  data-slot="switch-thumb"
                  className="bg-card dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
                ></span>
              </button>
            </div>
            <button
              data-slot="button"
              className="[&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground hover:bg-primary/90 has-[&gt;svg]:px-3 inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
            >
              Save Email Settings
            </button>
          </div>
        </Card>

        <Card className="pointer-events-none opacity-50">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-cyan-100 p-2 text-cyan-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-message-square h-5 w-5"
                aria-hidden="true"
              >
                <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Telegram Configuration</h3>
              <p className="text-sm text-gray-500">
                Configure Telegram bot notifications
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                data-slot="label"
                className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                Bot Token
              </label>
              <input
                type="password"
                data-slot="input"
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                id="botToken"
                placeholder="Enter your Telegram bot token"
              />
              <p className="text-xs text-gray-500">
                Get your bot token from @BotFather on Telegram
              </p>
            </div>
            <div className="space-y-2">
              <label
                data-slot="label"
                className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                Chat ID
              </label>
              <input
                data-slot="input"
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                id="chatId"
                placeholder="Enter your chat ID"
              />
              <p className="text-xs text-gray-500">
                Get your chat ID from @userinfobot on Telegram
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Telegram Notifications</p>
                <p className="text-sm text-gray-500">
                  Receive alerts via Telegram
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="false"
                data-state="unchecked"
                value="on"
                data-slot="switch"
                className="peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  data-state="unchecked"
                  data-slot="switch-thumb"
                  className="bg-card dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
                ></span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                data-slot="button"
                className="[&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 has-[&gt;svg]:px-3 inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
              >
                Test Connection
              </button>
              <button
                data-slot="button"
                className="[&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground hover:bg-primary/90 has-[&gt;svg]:px-3 inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
              >
                Save Telegram Settings
              </button>
            </div>
          </div>
        </Card>

        <Card className="pointer-events-none opacity-50">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 text-green-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                className="lucide lucide-smartphone h-5 w-5"
                aria-hidden="true"
              >
                <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                <path d="M12 18h.01"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold">SMS Configuration</h3>
              <p className="text-sm text-gray-500">
                Configure SMS alert notifications
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                data-slot="label"
                className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                Phone Number
              </label>
              <input
                type="tel"
                data-slot="input"
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input bg-input-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                id="phoneNumber"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <label
                data-slot="label"
                className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
              >
                SMS Provider
              </label>
              <button
                type="button"
                role="combobox"
                aria-controls="radix-:r14:"
                aria-expanded="false"
                aria-autocomplete="none"
                dir="ltr"
                data-state="closed"
                data-slot="select-trigger"
                data-size="default"
                className="border-input data-[placeholder]:text-muted-foreground [&amp;_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 bg-input-background [&amp;_svg]:pointer-events-none [&amp;_svg]:shrink-0 [&amp;_svg:not([class*='size-'])]:size-4 flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2"
                id="smsProvider"
              >
                <span data-slot="select-value">Twilio</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  className="lucide lucide-chevron-down size-4 opacity-50"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-gray-500">
                  Receive critical alerts via SMS
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="false"
                data-state="unchecked"
                value="on"
                data-slot="switch"
                className="peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  data-state="unchecked"
                  data-slot="switch-thumb"
                  className="bg-card dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
                ></span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Critical Only</p>
                <p className="text-sm text-gray-500">
                  Only send critical severity alerts
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked="true"
                data-state="checked"
                value="on"
                data-slot="switch"
                className="peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-switch-background focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  data-state="checked"
                  data-slot="switch-thumb"
                  className="bg-card dark:data-[state=unchecked]:bg-card-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
                ></span>
              </button>
            </div>
            <button
              data-slot="button"
              className="[&amp;_svg]:pointer-events-none [&amp;_svg:not([class*='size-'])]:size-4 [&amp;_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground hover:bg-primary/90 has-[&gt;svg]:px-3 inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
            >
              Save SMS Settings
            </button>
          </div>
        </Card>
      </PageLayout>
    </>
  );
};

export default NotificationsPage;
