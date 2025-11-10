import { useApi } from '@src/lib/api/ApiProvider';
import dayjs from 'dayjs';
import { ReactNode, useEffect, useState } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button, Form, Input, InputNumber, notification } from 'antd';
import { Icon } from '@iconify/react';
import clsx from 'clsx';
import { CreateDeviceRequest, Device } from '@src/lib/api/api.types';
import { DeviceCard } from './components/DeviceCard';
import Spinner from '@assets/Spinner';

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

  return (
    <>
      {isLoading && !devices ? (
        <div className="flex h-full w-full items-center justify-center">
          <Spinner />
        </div>
      ) : isCreationVisible ? (
        <DeviceCreationForm
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
          Add device
        </Card>
      )}
      {devices &&
        devices.map((device, id) => (
          <DeviceCard
            key={device.id ?? id}
            device={device}
            onSave={handleUpdate}
            onDelete={() => {
              if (!device.id) {
                notification.error({
                  message: 'Failed to delete device',
                  description: 'Device should have id',
                });
                return;
              }
              handleDelete(device.id, device.name ?? '');
            }}
          />
        ))}
    </>
  );
};

export default DevicesPage;

export const Card = (props: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
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

const DeviceCreationForm = ({
  onCreate,
  setIsCreationVisible,
}: {
  onCreate: (device: CreateDeviceRequest) => void;
  setIsCreationVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [device, setDevice] = useState<CreateDeviceRequest>({
    name: '',
  });

  const handleCreate = () => {
    if (device && device.name) {
      onCreate(device);
    }
  };

  return (
    <Card>
      <Form className="contents" layout="vertical" onFinish={handleCreate}>
        <Form.Item label="Name" required>
          <Input
            required
            value={device?.name}
            onChange={e => {
              setDevice({ ...device, name: e.currentTarget.value });
            }}
          />
        </Form.Item>
        <Form.Item label="Description">
          <Input.TextArea
            autoSize={{
              minRows: 3,
              maxRows: 6,
            }}
            value={device?.description}
            onChange={e => {
              setDevice({ ...device, description: e.currentTarget.value });
            }}
          />
        </Form.Item>

        <Form.Item label="Critical value">
          <InputNumber
            className="!block !w-full"
            value={device.criticalValue}
            onChange={val => {
              setDevice(prev => ({
                ...prev,
                criticalValue: val ?? undefined,
              }));
            }}
          />
        </Form.Item>

        <Form.Item label="Lower value">
          <InputNumber
            className="!block !w-full"
            value={device.lowerValue}
            onChange={val => {
              setDevice(prev => ({
                ...prev,
                lowerValue: val ?? undefined,
              }));
            }}
          />
        </Form.Item>

        <Form.Item label="Delay (ms)">
          <InputNumber
            className="!block !w-full"
            value={device.delay}
            onChange={val => {
              setDevice(prev => ({
                ...prev,
                delay: val ?? undefined,
              }));
            }}
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
