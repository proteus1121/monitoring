import { Device } from '@src/lib/api/api.types';
import { useEffect, useState } from 'react';
import { Card } from '../DevicesPage';
import { Button, Form, Input, InputNumber, Popconfirm, Tooltip } from 'antd';
import dayjs from 'dayjs';

export const DeviceCard = ({
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
    <>
      {isEditing ? (
        <EditableDeviceCard
          device={newDevice}
          onEnablePreview={() => setIsEditing(false)}
          onSave={handleSave}
          setDevice={setNewDevice}
        />
      ) : (
        <PreviewDeviceCard
          device={device}
          onEnableEditing={() => setIsEditing(true)}
          onDelete={onDelete}
        />
      )}
    </>
  );
};

export const PreviewDeviceCard = ({
  device,
  onDelete,
  onEnableEditing,
}: {
  device: Device;
  onDelete: () => void;
  onEnableEditing: () => void;
}) => {
  return (
    <Card className="relative flex flex-col gap-2">
      <div className="text-lg font-semibold">{device.name}</div>
      <div>
        Description:{' '}
        <span className="text-gray-600">
          {device.description ?? 'No description available'}
        </span>
      </div>
      <div>
        Critical value:{' '}
        <span className="text-gray-600">{device.criticalValue ?? 'null'}</span>
      </div>

      <div>
        Lower value:{' '}
        <span className="text-gray-600">{device.lowerValue ?? 'null'}</span>
      </div>

      <div>
        Delay (ms):{' '}
        <span className="text-gray-600">{device.delay ?? 'null'}</span>
      </div>
      <div>
        Status: <span className="text-gray-600"> {device.status}</span>
      </div>
      <div className="text-sm text-gray-500">
        Last checked:{' '}
        {device.lastChecked ? (
          <Tooltip title={dayjs(new Date(device.lastChecked)).toString()}>
            {dayjs(new Date(device.lastChecked)).fromNow()}
          </Tooltip>
        ) : (
          'No data'
        )}
      </div>
      <div className="ml-auto flex gap-2">
        <Button type="default" onClick={onEnableEditing}>
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
      </div>
    </Card>
  );
};

const EditableDeviceCard = ({
  device,
  setDevice,
  onEnablePreview,
  onSave,
}: {
  device: Device;
  setDevice: React.Dispatch<React.SetStateAction<Device>>;
  onEnablePreview: () => void;
  onSave: () => void;
}) => {
  return (
    <Card>
      <Form className="contents" layout="vertical">
        <Form.Item label="Name" required>
          <Input
            required
            value={device.name}
            onChange={e => {
              setDevice(prev => ({
                ...prev,
                name: e.currentTarget.value,
              }));
            }}
          />
        </Form.Item>

        <Form.Item label="Description">
          <Input.TextArea
            placeholder="Description"
            autoSize={{
              minRows: 3,
              maxRows: 6,
            }}
            value={device.description}
            onChange={e => {
              setDevice(prev => ({
                ...prev,
                description: e.currentTarget.value,
              }));
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

        <div className="flex w-full justify-end gap-2">
          <Button onClick={onEnablePreview}>Cancel</Button>

          <Button type="primary" onClick={onSave} htmlType="submit">
            Save
          </Button>
        </div>
      </Form>
    </Card>
  );
};
