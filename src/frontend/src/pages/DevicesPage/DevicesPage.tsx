import { Card } from '@src/components/Card';
import { useToast } from '@src/components/Toast';
import { Device } from '@src/lib/api/api.types';
import { useApi } from '@src/lib/api/ApiProvider';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Button, Popconfirm, Tooltip } from 'antd';
import { Icon } from '@iconify/react';

dayjs.extend(relativeTime);
const DevicesPage = () => {
  const api = useApi();
  const [devices, setDevices] = useState<Array<Device> | undefined>(undefined);
  const { toast } = useToast();
  useEffect(() => {
    const onLoad = async () => {
      const res = await api.getDevices();
      if (!res.ok) {
        toast({ title: res.message, variant: 'warning' });
        return;
      }

      setDevices(res.data);
    };
    onLoad();
  }, [api, setDevices]);

  const handleDelete = (device: Device) => {
    // Здесь вызови api для удаления, пока просто toast
    toast({ title: `Deleted ${device.name}`, variant: 'info' });
  };

  const handleEdit = (device: Device) => {
    toast({ title: `Edit ${device.name}`, variant: 'info' });
    // Тут можно открыть модальное окно редактирования
  };

  const [isCreationVisible, setIsCreationVisible] = useState<boolean>(false);
  const handleCreate = (device: Device) => {};

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
          <Card className="relative flex flex-col gap-2">
            {/* Кнопки Edit/Delete */}
            <div className="absolute top-2 right-2 flex gap-1">
              <Button
                size="small"
                type="default"
                onClick={() => handleEdit(device)}
              >
                Edit
              </Button>
              <Popconfirm
                title={`Are you sure to delete ${device.name}?`}
                onConfirm={() => handleDelete(device)}
                okText="Yes"
                cancelText="No"
              >
                <Button size="small" type="primary" danger>
                  Delete
                </Button>
              </Popconfirm>
            </div>

            <div className="text-lg font-semibold">{device.name}</div>
            <div>
              Description:{' '}
              <span className="text-gray-600">
                {device.description ?? 'No description available'}
              </span>
            </div>
            <div>
              Critical value:{' '}
              <span className="text-gray-600">{device.criticalValue}</span>
            </div>
            <div>
              Status: <span className="text-gray-600"> {device.status}</span>
            </div>
            <div className="text-sm text-gray-500">
              Last checked:{' '}
              <Tooltip title={dayjs(new Date(device.lastChecked)).toString()}>
                {dayjs(new Date(device.lastChecked)).fromNow()}
              </Tooltip>
            </div>
          </Card>
        ))}
    </>
  );
};

export default DevicesPage;
