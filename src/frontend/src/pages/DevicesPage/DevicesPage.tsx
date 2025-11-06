import { useToast } from '@src/components/Toast';
import { Device } from '@src/lib/api/api.types';
import { useApi } from '@src/lib/api/ApiProvider';
import dayjs from 'dayjs';
import { ReactNode, useEffect, useState } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button, Input, InputNumber, Popconfirm, Tooltip } from 'antd';
import { Icon } from '@iconify/react';
import clsx from 'clsx';

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

  const handleDelete = async (device: Device) => {
    const res = await api.deleteDevice(device.id);
    if (res.ok) {
      toast({ title: `Deleted ${device.name}`, variant: 'info' });
    }

    await fetchDevices();
  };

  const handleUpdate = async (device: Device) => {
    const res = await api.updateDevice(device);
    if (res.ok) {
      toast({ title: `${device.name} updated succesfully`, variant: 'info' });
    }

    await fetchDevices();
  };

  const [isCreationVisible, setIsCreationVisible] = useState<boolean>(false);
  const handleCreate = (device: Device) => {}; // TODO: HANDLE CREATION

  return (
    <>
      {isCreationVisible ? (
        <Card className="relative">
          <div className="absolute top-2 right-2 flex gap-1">
            <Button size="small" type="default">
              Add
            </Button>
            <Popconfirm
              title={`Are you sure to proceed without saving?`}
              onConfirm={() => setIsCreationVisible(false)}
              okText="Yes"
              cancelText="No"
            >
              <Button size="small" type="primary" danger>
                Exit
              </Button>
            </Popconfirm>
          </div>
          Creation
        </Card>
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
        devices.map(device => (
          <DeviceCard
            device={device}
            onSave={handleUpdate}
            onDelete={() => {
              handleDelete(device);
            }}
          />
        ))}
    </>
  );
};

export default DevicesPage;

const Card = (props: {
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

const DeviceCard = ({
  device,
  onSave,
  onDelete,
}: {
  device: Device;
  onSave: (newDevice: Device) => void;
  onDelete: () => void;
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [newDevice, setNewDevice] = useState<Device>(device);

  useEffect(() => {
    setNewDevice(device);
  }, [isEditing, device]);

  const handleSave = () => {
    onSave(newDevice);
    setIsEditing(false);
  };
  return (
    <Card className="relative flex flex-col gap-2">
      <form
        className="contents"
        onSubmit={e => {
          e.preventDefault();
          handleSave();
        }}
      >
        {isEditing ? (
          <>
            Name:
            <Input
              value={newDevice.name}
              onChange={e => {
                setNewDevice(prev => ({
                  ...prev,
                  name: e.currentTarget.value,
                }));
              }}
            />
          </>
        ) : (
          <div className="text-lg font-semibold">{device.name}</div>
        )}

        <div>
          Description:{' '}
          {isEditing ? (
            <Input
              value={newDevice.description}
              onChange={e => {
                setNewDevice(prev => ({
                  ...prev,
                  description: e.currentTarget.value,
                }));
              }}
            />
          ) : (
            <span className="text-gray-600">
              {device.description ?? 'No description available'}
            </span>
          )}
        </div>

        <div>
          Critical value:{' '}
          {isEditing ? (
            <InputNumber
              className="!block !w-full"
              value={newDevice.criticalValue}
              onChange={val => {
                setNewDevice(prev => ({
                  ...prev,
                  criticalValue: val ?? 0,
                }));
              }}
            />
          ) : (
            <span className="text-gray-600">{device.criticalValue}</span>
          )}
        </div>

        {!isEditing && (
          <div>
            Status: <span className="text-gray-600"> {device.status}</span>
          </div>
        )}

        {!isEditing && (
          <div className="text-sm text-gray-500">
            Last checked:{' '}
            <Tooltip title={dayjs(new Date(device.lastChecked)).toString()}>
              {dayjs(new Date(device.lastChecked)).fromNow()}
            </Tooltip>
          </div>
        )}

        <div className="ml-auto flex gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={() => {
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>

              <Button type="primary" onClick={handleSave} htmlType="submit">
                Save
              </Button>
            </>
          ) : (
            <>
              <Button type="default" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Popconfirm
                title={`Are you sure to delete ${device.name}?`}
                onConfirm={onDelete}
                okText="Yes"
                cancelText="No"
              >
                <Button type="primary" danger>
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      </form>
    </Card>
  );
};
