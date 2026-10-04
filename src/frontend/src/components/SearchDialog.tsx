import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@src/components/Command';
import { DeviceIcon } from '@src/pages/DevicesPage/DevicesPage';
import { DEVICE_TYPE_LABELS } from '@src/lib/hardware';
import { useTexts } from '@src/lib/lang';
import {
  useGetAllDevicesQuery,
  useGetControllersQuery,
  useGetRecentIncidentsQuery,
} from '@src/redux/generatedApi';

const TEXTS = {
  uk: {
    search: 'Пошук',
    searchHint: 'Пошук пристроїв, плат, сповіщень і сторінок',
    placeholder: 'Пристрої, плати, сповіщення…',
    nothing: 'Нічого не знайдено.',
    devices: 'Пристрої',
    boards: 'Плати',
    alerts: 'Сповіщення',
    pages: 'Сторінки',
    online: 'онлайн',
    offline: 'офлайн',
    pageNames: ['Огляд', 'Мої пристрої', 'Оновлення', 'Бібліотека', 'Користувачі', 'Сповіщення'],
  },
  en: {
    search: 'Search',
    searchHint: 'Search devices, boards, alerts and pages',
    placeholder: 'Search devices, boards, alerts…',
    nothing: 'Nothing found.',
    devices: 'Devices',
    boards: 'Boards',
    alerts: 'Alerts',
    pages: 'Pages',
    online: 'online',
    offline: 'offline',
    pageNames: ['Overview', 'My devices', 'Updates', 'Library', 'Users', 'Alerts'],
  },
};

// names in TEXTS.pageNames, in this order
const PAGES = [
  { icon: 'lucide:layout-dashboard', to: '/dashboard/overview' },
  { icon: 'lucide:microchip', to: '/settings/devices' },
  { icon: 'lucide:refresh-cw', to: '/settings/firmware' },
  { icon: 'lucide:library', to: '/settings/library' },
  { icon: 'lucide:users', to: '/settings/users' },
  { icon: 'lucide:bell', to: '/settings/alerts' },
];

/**
 * Search over pages, devices, boards and recent alerts; opens with the header button or Ctrl/Cmd+K.
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const t = useTexts(TEXTS);
  // only fetch while the dialog is open, the lists are cached afterwards
  const { data: devices } = useGetAllDevicesQuery(undefined, { skip: !open });
  const { data: controllers } = useGetControllersQuery(undefined, { skip: !open });
  const { data: incidents } = useGetRecentIncidentsQuery(
    { openOnly: false, limit: 30 },
    { skip: !open }
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-md px-2 text-sm text-slate-500 transition-colors hover:bg-gray-100 sm:border sm:border-black/10 sm:pr-1.5 sm:pl-3"
        aria-label={t.search}
      >
        <Icon icon="lucide:search" className="size-4 sm:size-4" />
        <span className="hidden sm:inline">{t.search}…</span>
        <kbd className="hidden rounded border border-black/10 bg-gray-50 px-1.5 text-[11px] text-slate-400 sm:inline">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t.search}
        description={t.searchHint}
      >
        <CommandInput placeholder={t.placeholder} />
        <CommandList>
          <CommandEmpty>{t.nothing}</CommandEmpty>

          {!!devices?.length && (
            <CommandGroup heading={t.devices}>
              {devices.map(device => (
                <CommandItem
                  key={device.id}
                  value={`device ${device.id} ${device.name} ${device.type} ${device.description ?? ''}`}
                  onSelect={() => go(`/dashboard/overview?device=${device.id}#chart`)}
                >
                  <DeviceIcon type={device.type} />
                  <span>{device.name}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {device.type ? DEVICE_TYPE_LABELS[device.type] : ''}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!controllers?.length && (
            <CommandGroup heading={t.boards}>
              {controllers.map(controller => (
                <CommandItem
                  key={controller.id}
                  value={`board ${controller.name} ${controller.hardwareId} ${controller.ipAddress ?? ''}`}
                  onSelect={() => go('/settings/devices')}
                >
                  <Icon icon="lucide:cpu" />
                  <span>{controller.name}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {controller.online ? t.online : t.offline}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!incidents?.length && (
            <CommandGroup heading={t.alerts}>
              {incidents.map(incident => (
                <CommandItem
                  key={incident.id}
                  value={`alert ${incident.id} ${incident.message} ${incident.devices?.map(d => d.name).join(' ')}`}
                  onSelect={() => go('/dashboard/overview#alerts')}
                >
                  <Icon icon="lucide:triangle-alert" />
                  <span className="truncate">{incident.message}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading={t.pages}>
            {PAGES.map((page, i) => (
              <CommandItem
                key={page.to}
                value={`page ${t.pageNames[i]}`}
                onSelect={() => go(page.to)}
              >
                <Icon icon={page.icon} />
                <span>{t.pageNames[i]}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
