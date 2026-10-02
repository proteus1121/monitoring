import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import { Loader } from '@src/components/Loader';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { useModal } from '@src/redux/modals/modals.hook';
import { DeviceUpdatingModalId } from '@src/redux/modals/DeviceUpdatingModal';
import {
  Controller,
  Device,
  useGetAllDevicesQuery,
  useGetControllersQuery,
  useGetSensorModelsQuery,
} from '@src/redux/generatedApi';
import { BoardDiagram } from './BoardDiagram';

dayjs.extend(relativeTime);
dayjs.extend(utc);

const POLLING_INTERVAL_MS = 30000;

export function MapPage() {
  const { data: controllers, isLoading: isControllersLoading } =
    useGetControllersQuery(undefined, { pollingInterval: POLLING_INTERVAL_MS });
  const { data: devices, isLoading: isDevicesLoading } = useGetAllDevicesQuery(
    undefined,
    { pollingInterval: POLLING_INTERVAL_MS }
  );
  const { data: models } = useGetSensorModelsQuery();
  const { setState: editDevice } = useModal(DeviceUpdatingModalId);

  if (isControllersLoading || isDevicesLoading) {
    return <Loader />;
  }

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-2">
        <div>
          <PageHeaderTitle>Map</PageHeaderTitle>
          <PageHeaderDescription>
            Wiring of every board as it is configured. Click a device to edit it.
          </PageHeaderDescription>
        </div>
      </PageHeader>

      {!controllers?.length && (
        <Card className="text-sm text-slate-600">
          No boards yet. Flash the firmware and connect it with your User ID,
          see{' '}
          <Link to="/settings/devices" className="text-blue-600 underline">
            Devices
          </Link>
          .
        </Card>
      )}

      {controllers?.map(controller => (
        <ControllerMap
          key={controller.id}
          controller={controller}
          devices={(devices ?? []).filter(
            d => d.controllerId === controller.id && d.sensorModel
          )}
          models={models}
          onDeviceClick={editDevice}
        />
      ))}

      <Legend />
    </PageLayout>
  );
}

function ControllerMap(props: {
  controller: Controller;
  devices: Device[];
  models: Parameters<typeof BoardDiagram>[0]['models'];
  onDeviceClick: (device: Device) => void;
}) {
  const { controller } = props;
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
          <Icon icon="lucide:cpu" className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">{controller.name}</h3>
          <p className="font-mono text-xs text-slate-500">
            {controller.hardwareId}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 text-white ${controller.online ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            {controller.online ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span
            className={`rounded-full px-2 text-white ${controller.synced ? 'bg-blue-500' : 'bg-orange-500'}`}
          >
            {controller.synced ? 'CONFIG APPLIED' : 'CONFIG PENDING'}
          </span>
          <span className="text-slate-500">
            {controller.ipAddress}
            {controller.lastSeen &&
              ` · seen ${dayjs.utc(controller.lastSeen).fromNow()}`}
          </span>
        </div>
      </div>

      {props.devices.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing is wired to this board yet. Add a device with this controller
          on the{' '}
          <Link to="/settings/devices" className="text-blue-600 underline">
            Devices
          </Link>{' '}
          page.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <BoardDiagram
            controller={controller}
            devices={props.devices}
            models={props.models}
            onDeviceClick={props.onDeviceClick}
          />
        </div>
      )}
    </Card>
  );
}

function Legend() {
  const items = [
    { color: 'bg-green-500', label: 'OK' },
    { color: 'bg-orange-500', label: 'Warning' },
    { color: 'bg-red-500', label: 'Critical' },
    { color: 'bg-gray-500', label: 'Offline' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1">
          <span className={`size-2.5 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-yellow-400" />
        Used pin
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-gray-400" />
        Taken by the board (display, serial)
      </span>
    </div>
  );
}
