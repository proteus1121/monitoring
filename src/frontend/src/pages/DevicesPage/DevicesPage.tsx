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
import { H1, H3 } from '@src/components/Text';
import { AlertDialogModalId } from '@src/redux/modals/AlertDialog';
import { DeviceUpdatingModalId } from '@src/redux/modals/DeviceUpdatingModal';
import {
  Device,
  useDeleteDeviceMutation,
  useGetAllDevicesQuery,
} from '@src/redux/generatedApi';

dayjs.extend(relativeTime);
const DevicesPage = () => {
  const { data: devices, isLoading, error } = useGetAllDevicesQuery();

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

  const { setState: deletionModal } = useModal(AlertDialogModalId);
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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
        {devices &&
          devices.map((device, id) => (
            <DeviceCard
              key={device.id ?? id}
              device={device}
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
  onDelete: () => void;
  onUpdate: () => void;
}) {
  return (
    <Card className="flex flex-col gap-6 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
            <div className="grid aspect-square place-items-center text-xs">
              icon
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{props.device.name}</h3>
            <p className="text-sm text-gray-500">{props.device.description}</p>
          </div>
        </div>

        <span
          className={`rounded-full px-2 text-xs text-white ${getColorByStatus(props.device.status)}`}
        >
          {props.device.status}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <Button size="icon" variant="ghost" onClick={props.onUpdate}>
          <Icon icon="lucide:edit" />
        </Button>

        <Button size="icon" variant="ghost" onClick={props.onDelete}>
          <Icon icon="lucide:trash-2" />
        </Button>
      </div>
    </Card>
  );
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

  return 'bg-gray-700';
}
