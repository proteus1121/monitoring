import { useToast } from '@src/components/Toast';
import { useApi } from '@src/lib/api/ApiProvider';
import dayjs from 'dayjs';
import { ReactNode, useEffect, useState } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button, Form, Input, InputNumber, Popconfirm, Tooltip } from 'antd';
import { Icon } from '@iconify/react';
import clsx from 'clsx';
import { CreateDeviceRequest, Device } from '@src/lib/api/api.types';
import { DeviceCard } from './components/DeviceCard';

dayjs.extend(relativeTime);
const DevicesPage = () => {
  const api = useApi();
  const [devices, setDevices] = useState<Array<Device> | undefined>(undefined);
  const { toast } = useToast();

  const fetchDevices = async () => {
    const res = await api.getDevices();
    if (!res.ok) {
      toast({ title: res.message, variant: 'warning' });
      return;
    }

    setDevices(res.data);
  };

  useEffect(() => {
    fetchDevices();
  }, [api, setDevices]);

  const handleDelete = async (deviceId: number, deviceName: string) => {
    const res = await api.deleteDevice(deviceId);
    if (res.ok) {
      toast({ title: `Deleted ${deviceName}`, variant: 'info' });
    }

    await fetchDevices();
  };

  const handleUpdate = async (device: Device) => {
    if (!device.id || !device.name) {
      toast({ title: 'Failed to update device', variant: 'warning' });
      return;
    }

    const res = await api.updateDevice({
      id: device.id!,
      deviceType: device.type,
      name: device.name,
      delay: device.delay,
      description: device.description,
      criticalValue: device.criticalValue,
    });
    if (res.ok) {
      toast({ title: `${device.name} updated succesfully`, variant: 'info' });
    } else {
      toast({ title: 'Failed to update device', variant: 'warning' });
    }

    await fetchDevices();
  };

  const [isCreationVisible, setIsCreationVisible] = useState<boolean>(false);
  const handleCreate = async (device: CreateDeviceRequest) => {
    const res = await api.createDevice(device);
    if (res.ok) {
      toast({ title: `${device.name} updated succesfully`, variant: 'info' });
    } else {
      toast({ title: 'Failed to update device', variant: 'warning' });
    }

    await fetchDevices();
  };

  return (
    <>
      {isCreationVisible ? (
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
                toast({ title: 'Failed to delete device', variant: 'warning' });
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
      <Form className="contents" layout="vertical">
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

        {/* <Form.Item label="Lower value"> */}
        {/*   <InputNumber */}
        {/*     className="!block !w-full" */}
        {/*     value={device.lowerValue} */}
        {/*     onChange={val => { */}
        {/*       setDevice(prev => ({ */}
        {/*         ...prev, */}
        {/*         lowerValue: val ?? undefined, */}
        {/*       })); */}
        {/*     }} */}
        {/*   /> */}
        {/* </Form.Item> */}

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

          <Button
            type="primary"
            onClick={() => {
              // handleCreate(device);
            }}
            htmlType="submit"
          >
            Create
          </Button>
        </div>
      </Form>
    </Card>
  );
};
