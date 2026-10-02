import dayjs from 'dayjs';
import { useEffect } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import { notification } from 'antd';
import { DeviceCreationModalId } from '@src/redux/modals/DeviceCreationModal';
import { useModal } from '@src/redux/modals/modals.hook';
import { Button } from '@src/components/Button';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import { PageHeader, PageHeaderTitle } from '@src/components/PageHeader';
import { Loader } from '@src/components/Loader';
import { PageLayout } from '@src/layouts/PageLayout';
import { H1, H2, H3 } from '@src/components/Text';
import { AppAlertDialogModalId } from '@src/redux/modals/AlertDialog';
import { DeviceUpdatingModalId } from '@src/redux/modals/DeviceUpdatingModal';
import {
  Controller,
  Device,
  useDeleteDeviceMutation,
  useGetAllDevicesQuery,
  useGetControllersQuery,
  useGetSensorModelsQuery,
  useSendCommandMutation,
} from '@src/redux/generatedApi';
import { ControllersSection } from './ControllersSection';
import { DEVICE_TYPE_LABELS, getPinLabel } from '@src/lib/hardware';

dayjs.extend(relativeTime);
const DevicesPage = () => {
  const { data: devices, isLoading, error } = useGetAllDevicesQuery();
  const { data: controllers } = useGetControllersQuery();

  const [deleteDeviceMutation] = useDeleteDeviceMutation();

  useEffect(() => {
    if (error) {
      notification.error({
        message: `Failed to load devices:${JSON.stringify(error)}`,
      });
    }
  }, [error]);

  const handleDelete = async (deviceId: number, deviceName?: string) => {
    const res = await deleteDeviceMutation({
      id: deviceId,
    });

    if (res.data) {
      notification.success({ message: `Deleted ${deviceName ?? 'device'}` });
    }
  };

  const { setState } = useModal(DeviceCreationModalId);

  const { setState: deletionModal } = useModal(AppAlertDialogModalId);
  const { setState: updationModal } = useModal(DeviceUpdatingModalId);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <PageLayout>
      <PageHeader>
        <div>
          <PageHeaderTitle>
            <H1>Device Configurations</H1>
          </PageHeaderTitle>
          <H3>Manage and configure your smart devices</H3>
        </div>

        <Button onClick={() => setState(true)} className="ml-2 shrink-0">
          <Icon icon="lucide:plus" className="size-4" />
          Add Device
        </Button>
      </PageHeader>
      <ControllersSection />
      <H2 className="mb-4">Devices</H2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
        {devices &&
          devices.map((device, id) => (
            <DeviceCard
              key={device.id ?? id}
              device={device}
              controller={controllers?.find(c => c.id === device.controllerId)}
              onDelete={() =>
                deletionModal({
                  callback: async () =>
                    await handleDelete(device?.id ?? -1, device.name),
                })
              }
              onUpdate={() => updationModal(device)}
              // onSave={handleUpdate}
              // onDelete={() => {
              //   if (!device.id) {
              //     notification.error({
              //       message: 'Failed to delete device',
              //       description: 'Device should have id',
              //     });
              //     return;
              //   }
              //   handleDelete(device.id, device.name ?? '');
              // }}
            />
          ))}
      </div>
    </PageLayout>
  );
};

export default DevicesPage;

function DeviceCard(props: {
  device: Device;
  controller?: Controller;
  onDelete: () => void;
  onUpdate: () => void;
}) {
  const { data: models } = useGetSensorModelsQuery();
  const model = models?.find(m => m.model === props.device.sensorModel);

  return (
    <Card className="bg-card text-card-foreground flex w-full flex-col gap-6 rounded-xl border">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
          <DeviceIcon type={props.device.type} className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold">{props.device.name}</h3>
          {props.device.type && (
            <p className="text-xs text-slate-500">
              {DEVICE_TYPE_LABELS[props.device.type]}
            </p>
          )}
        </div>
      </div>
      {props.device.controllerId ? (
        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-2 text-xs text-slate-600">
          <div className="flex items-center gap-1">
            <Icon icon="lucide:cpu" className="size-3.5" />
            {props.controller?.name ?? `Controller #${props.device.controllerId}`}
          </div>
          <div>
            {model?.label ?? props.device.sensorModel} ·{' '}
            {model?.pins?.[0] ?? 'pin'}{' '}
            {getPinLabel(props.controller?.platform, props.device.pin)}
            {props.device.secondaryPin !== undefined &&
              props.device.secondaryPin !== null && (
                <>
                  , {model?.pins?.[1] ?? 'pin 2'}{' '}
                  {getPinLabel(
                    props.controller?.platform,
                    props.device.secondaryPin
                  )}
                </>
              )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-2 text-xs text-slate-500">
          Not wired to a controller
        </div>
      )}
      {model?.output && props.device.controllerId && (
        <RelayControls deviceId={props.device.id!} />
      )}
      <div className="flex h-full gap-4">
        <p className="text-sm leading-relaxed text-slate-600">
          {props.device.description}
        </p>
      </div>
      <div className="flex gap-2 border-t pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 text-xs text-white ${getColorByStatus(props.device.status)}`}
          >
            {props.device.status}
          </span>
        </div>

        <div className="ml-auto flex justify-between">
          <div className="flex w-9 items-center gap-1">
            <Icon icon="lucide:user" />
            {props.device.userDevices?.length}
          </div>

          <Button size="icon" variant="ghost" onClick={props.onUpdate}>
            <Icon icon="lucide:edit" />
          </Button>

          <Button size="icon" variant="ghost" onClick={props.onDelete}>
            <Icon icon="lucide:trash-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function RelayControls({ deviceId }: { deviceId: number }) {
  const [sendCommand, { isLoading }] = useSendCommandMutation();

  const send = async (value: number) => {
    const res = await sendCommand({
      id: deviceId,
      deviceCommandRequest: { value },
    });
    if (res.error) {
      notification.error({
        message: 'Failed to send command',
        description: JSON.stringify(res.error),
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        className="flex-1"
        disabled={isLoading}
        onClick={() => send(1)}
      >
        <Icon icon="lucide:power" />
        On
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="flex-1"
        disabled={isLoading}
        onClick={() => send(0)}
      >
        <Icon icon="lucide:power-off" />
        Off
      </Button>
    </div>
  );
}

export function DeviceIcon({
  type,
  className,
}: {
  type: Device['type'];
  className?: string;
}) {
  let icon = 'lucide:microchip';

  if (type === 'TEMPERATURE') icon = 'lucide:thermometer';
  if (type === 'SMOKE') icon = 'lucide:cloud';
  if (type === 'FLAME') icon = 'lucide:flame';
  if (type === 'LIGHT') icon = 'lucide:lightbulb';
  if (type === 'HUMIDITY') icon = 'lucide:droplet';
  if (type === 'PRESSURE') icon = 'lucide:gauge';
  if (type === 'MOTION') icon = 'lucide:footprints';
  if (type === 'LPG' || type === 'CH4') icon = 'lucide:fuel';
  if (type === 'RELAY') icon = 'lucide:power';
  if (type === 'DIGITAL') icon = 'lucide:toggle-left';
  if (type === 'ANALOG') icon = 'lucide:activity';

  return <Icon icon={icon} className={className} />;
}

function getColorByStatus(status?: Device['status']) {
  if (status === 'OK') {
    return 'bg-green-500';
  }

  if (status === 'WARNING') {
    return 'bg-orange-500';
  }

  if (status === 'CRITICAL') {
    return 'bg-red-500';
  }
  if (status === 'OFFLINE') {
    return 'bg-gray-700';
  }

  return 'bg-black';
}
