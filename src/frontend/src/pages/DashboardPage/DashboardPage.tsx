import { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { DatePicker, Select } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { Icon } from '@iconify/react';
import clsx from 'clsx';
import DeviceDataChart from './components/DeviceDataChart';
import { AlertsCard } from './components/AlertsCard';
import { PageLayout } from '@src/layouts/PageLayout';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { Card } from '@src/components/Card';
import { Loader } from '@src/components/Loader';
import { DeviceIcon } from '@src/pages/DevicesPage/DevicesPage';
import { DEVICE_TYPE_LABELS } from '@src/lib/hardware';
import { formatReading, fromNow, serverTime } from '@src/lib/readings';
import {
  Device,
  LatestReading,
  useGetAllDevicesQuery,
  useGetControllersQuery,
  useGetLatestReadingsQuery,
  useGetOpenIncidentCountQuery,
} from '@src/redux/generatedApi';

const { RangePicker } = DatePicker;

const POLLING_INTERVAL_MS = 15000;

const STATUS_DOT: Record<string, string> = {
  OK: 'bg-green-500',
  WARNING: 'bg-orange-500',
  CRITICAL: 'bg-red-500',
  OFFLINE: 'bg-gray-400',
};

export const DashboardPage = () => {
  const { data: devices, isLoading } = useGetAllDevicesQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  const { data: readings } = useGetLatestReadingsQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  const { data: controllers } = useGetControllersQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  const { data: openAlerts = 0 } = useGetOpenIncidentCountQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [chosenDeviceIds, setChosenDeviceIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(1, 'day'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(1, 'hour'));

  // ?device=ID from search selects that device, otherwise the first one
  useEffect(() => {
    if (!devices?.length) return;
    const requested = Number(searchParams.get('device'));
    if (requested && devices.some(d => d.id === requested)) {
      setChosenDeviceIds([requested]);
    } else if (chosenDeviceIds.length === 0) {
      setChosenDeviceIds([devices[0].id!]);
    }
  }, [devices, searchParams]);

  // jump to #chart / #alerts after navigating from search or the alerts popover
  useEffect(() => {
    if (!location.hash || isLoading) return;
    document
      .getElementById(location.hash.slice(1))
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location, isLoading]);

  const readingByDevice = useMemo(
    () => new Map((readings ?? []).map(r => [r.deviceId, r])),
    [readings]
  );

  if (isLoading) {
    return <Loader />;
  }

  const onlineDevices = devices?.filter(d => d.status !== 'OFFLINE').length ?? 0;
  const onlineBoards = controllers?.filter(c => c.online).length ?? 0;
  const lastReading = (readings ?? [])
    .map(r => r.timestamp)
    .sort()
    .at(-1);

  const toggleDevice = (id: number) => {
    setChosenDeviceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    document
      .getElementById('chart')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>Overview</PageHeaderTitle>
          <PageHeaderDescription>
            Live state of your devices, boards and alerts
          </PageHeaderDescription>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          icon="lucide:microchip"
          label="Devices online"
          value={`${onlineDevices} / ${devices?.length ?? 0}`}
        />
        <Stat
          icon="lucide:cpu"
          label="Boards online"
          value={`${onlineBoards} / ${controllers?.length ?? 0}`}
        />
        <Stat
          icon="lucide:triangle-alert"
          label="Open alerts"
          value={String(openAlerts)}
          tone={openAlerts > 0 ? 'alert' : undefined}
          href="#alerts"
        />
        <Stat
          icon="lucide:activity"
          label="Last data"
          value={lastReading ? fromNow(lastReading) : '—'}
        />
      </div>

      <section>
        <h2 className="mb-3 font-semibold">Live readings</h2>
        {devices?.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {devices.map(device => (
              <ReadingTile
                key={device.id}
                device={device}
                reading={readingByDevice.get(device.id!)}
                selected={chosenDeviceIds.includes(device.id!)}
                onClick={() => toggleDevice(device.id!)}
              />
            ))}
          </div>
        ) : (
          <Card className="text-sm text-slate-500">
            No devices yet — add them on the Devices page.
          </Card>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <div id="chart" className="scroll-mt-24" />
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div>
              <h3 className="font-semibold">History</h3>
              <span className="text-sm text-gray-500">
                Hourly values, dashed line is the forecast
              </span>
            </div>
            <RangePicker
              value={[startDate, endDate]}
              onChange={dates => {
                if (dates?.[0]) setStartDate(dates[0]);
                if (dates?.[1]) setEndDate(dates[1]);
              }}
            />
          </div>
          {devices && devices.length > 0 && (
            <Select
              mode="multiple"
              placeholder="Select devices"
              className="mb-4 w-full"
              value={chosenDeviceIds}
              onChange={(ids: number[]) => setChosenDeviceIds(ids)}
              options={devices.map(device => ({
                label: device.name,
                value: device.id!,
              }))}
              maxTagCount="responsive"
            />
          )}
          <DeviceDataChart
            devices={devices}
            choosenDevicesIds={chosenDeviceIds}
            startDate={startDate}
            endDate={endDate}
          />
        </Card>

        <AlertsCard />
      </div>
    </PageLayout>
  );
};

function Stat(props: {
  icon: string;
  label: string;
  value: string;
  tone?: 'alert';
  href?: string;
}) {
  const content = (
    <Card
      className={clsx(
        'flex h-full items-center gap-3',
        props.href && 'transition-colors hover:bg-gray-50'
      )}
    >
      <Icon
        icon={props.icon}
        className={clsx(
          'size-5 shrink-0',
          props.tone === 'alert' ? 'text-red-500' : 'text-slate-400'
        )}
      />
      <div className="min-w-0">
        <div className="text-xs text-slate-500">{props.label}</div>
        <div
          className={clsx(
            'truncate text-lg font-semibold',
            props.tone === 'alert' && 'text-red-600'
          )}
        >
          {props.value}
        </div>
      </div>
    </Card>
  );
  return props.href ? <a href={props.href}>{content}</a> : content;
}

function ReadingTile(props: {
  device: Device;
  reading?: LatestReading;
  selected: boolean;
  onClick: () => void;
}) {
  const { device, reading } = props;
  const formatted = formatReading(device, reading?.value);
  // a reading older than 10 minutes is shown as stale
  const stale =
    !reading || dayjs().diff(serverTime(reading.timestamp), 'minute') > 10;

  return (
    <button
      type="button"
      onClick={props.onClick}
      title={props.selected ? 'Remove from chart' : 'Show on chart'}
      className={clsx(
        'flex flex-col gap-2 rounded-xl border bg-white p-3 text-left transition-colors hover:border-blue-300',
        props.selected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-black/10'
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <DeviceIcon type={device.type} className="size-4 text-slate-500" />
        <span className="min-w-0 flex-1 truncate font-medium">{device.name}</span>
        <span
          className={clsx(
            'size-2 shrink-0 rounded-full',
            STATUS_DOT[device.status ?? 'OFFLINE']
          )}
          title={device.status}
        />
      </div>
      <div className={clsx('flex items-baseline gap-1', stale && 'opacity-40')}>
        <span className="text-2xl font-semibold tabular-nums">
          {formatted.value}
        </span>
        <span className="text-sm text-slate-500">{formatted.unit}</span>
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{device.type ? DEVICE_TYPE_LABELS[device.type] : ''}</span>
        <span>{reading ? fromNow(reading.timestamp) : 'no data'}</span>
      </div>
    </button>
  );
}
