import { useApi } from '@src/lib/api/ApiProvider';
import dayjs from 'dayjs';
import { ReactNode, useEffect, useState } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Form, Input, InputNumber, notification, Switch } from 'antd';
import { CreateDeviceRequest, Device } from '@src/lib/api/api.types';
import { Header } from '@src/components/Header';
import { deviceCreationModalId } from '@src/redux/modals/DeviceCreationModal';
import { useModal } from '@src/redux/modals/modals.hook';
import { Button } from '@src/components/Button';
import { Icon } from '@iconify/react';

dayjs.extend(relativeTime);
const DevicesPage = () => {
  const api = useApi();
  const [devices, setDevices] = useState<Array<Device> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchDevices = async () => {
    setIsLoading(true);
    const res = await api.getDevices();
    if (!res.ok) {
      notification.error({
        message: 'Failed to fetch devices',
        description: res.message,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setDevices(res.data);
  };

  useEffect(() => {
    fetchDevices();
  }, [api, setDevices]);

  const handleDelete = async (deviceId: number, deviceName: string) => {
    const res = await api.deleteDevice(deviceId);
    if (res.ok) {
      notification.success({ message: `Deleted ${deviceName}` });
    }

    await fetchDevices();
  };

  const handleUpdate = async (device: Device) => {
    if (!device.id || !device.name) {
      notification.error({
        message: 'Failed to update device',
        description: 'Device should have id and name',
      });
      return;
    }

    const res = await api.updateDevice({
      id: device.id!,
      deviceType: device.type,
      name: device.name,
      delay: device.delay,
      description: device.description,
      criticalValue: device.criticalValue,
      lowerValue: device.lowerValue,
    });
    if (res.ok) {
      notification.success({ message: `${device.name} updated succesfully` });
    } else {
      notification.error({
        message: 'Failed to update device',
        description: res.message,
      });
    }

    await fetchDevices();
  };

  const [isCreationVisible, setIsCreationVisible] = useState<boolean>(false);
  const handleCreate = async (device: CreateDeviceRequest) => {
    const res = await api.createDevice(device);
    if (res.ok) {
      notification.success({ message: `${device.name} created succesfully` });
    } else {
      notification.error({
        message: 'Failed to create device',
        description: res.message,
      });
    }

    setIsCreationVisible(false);
    await fetchDevices();
  };

  const { setState } = useModal(deviceCreationModalId);
  return (
    <>
      <Header>Devices</Header>
      <div className="space-y-4 p-6">
        <Button variant="primary" onClick={() => setState(true)}>
          <Icon icon="lucide:plus" className="mr-2 size-4" />
          Add Device
        </Button>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-4">
          {devices &&
            devices.map((device, id) => (
              <NewCard
                key={device.id ?? id}
                device={device}
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
      </div>
    </>
  );
};

export default DevicesPage;

function NewCard(props: { device: Device }) {
  return (
    <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-black/10 p-4 transition-shadow hover:shadow-lg">
      <div className="mb-3 flex items-start justify-between">
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
        <span className="rounded-full bg-green-500 px-2 text-xs text-white">
          {props.device.status}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-black/10 pt-3">
        <span className="text-sm text-gray-600">Power</span>
        <Switch />
      </div>
    </div>
  );
}
