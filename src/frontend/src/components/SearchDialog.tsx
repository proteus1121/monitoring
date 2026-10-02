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
import {
  useGetAllDevicesQuery,
  useGetControllersQuery,
  useGetRecentIncidentsQuery,
} from '@src/redux/generatedApi';

const PAGES = [
  { label: 'Overview', icon: 'lucide:home', to: '/dashboard/overview' },
  { label: 'Map', icon: 'lucide:map', to: '/dashboard/map' },
  { label: 'Devices', icon: 'lucide:microchip', to: '/settings/devices' },
  { label: 'Users', icon: 'lucide:users', to: '/settings/users' },
  { label: 'Alert templates', icon: 'lucide:bell', to: '/settings/alerts' },
];

/**
 * Search over pages, devices, boards and recent alerts; opens with the header button or Ctrl/Cmd+K.
 */
export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
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
        aria-label="Search"
      >
        <Icon icon="lucide:search" className="size-4 sm:size-4" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden rounded border border-black/10 bg-gray-50 px-1.5 text-[11px] text-slate-400 sm:inline">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search devices, boards, alerts and pages"
      >
        <CommandInput placeholder="Search devices, boards, alerts…" />
        <CommandList>
          <CommandEmpty>Nothing found.</CommandEmpty>

          {!!devices?.length && (
            <CommandGroup heading="Devices">
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
            <CommandGroup heading="Boards">
              {controllers.map(controller => (
                <CommandItem
                  key={controller.id}
                  value={`board ${controller.name} ${controller.hardwareId} ${controller.ipAddress ?? ''}`}
                  onSelect={() => go('/dashboard/map')}
                >
                  <Icon icon="lucide:cpu" />
                  <span>{controller.name}</span>
                  <span className="ml-auto text-xs text-slate-400">
                    {controller.online ? 'online' : 'offline'}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {!!incidents?.length && (
            <CommandGroup heading="Alerts">
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

          <CommandGroup heading="Pages">
            {PAGES.map(page => (
              <CommandItem
                key={page.to}
                value={`page ${page.label}`}
                onSelect={() => go(page.to)}
              >
                <Icon icon={page.icon} />
                <span>{page.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
