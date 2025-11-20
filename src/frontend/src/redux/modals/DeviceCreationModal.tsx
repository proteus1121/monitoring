import { clsx } from 'clsx';
import { useModal } from './modals.hook';
import { SimpleModalState } from './modals.types';
import { ReactNode, useEffect, useState } from 'react';
import { CreateDeviceRequest } from '@src/lib/api/api.types';
import { Form, Input, InputNumber, notification } from 'antd';
import { useApi } from '@src/lib/api/ApiProvider';
import { Spinner } from '@src/components/Spinner';
import { Button } from '@src/components/Button';
export const deviceCreationModalId = 'device-creation-modal-id';
export type DeviceCreationModal = SimpleModalState<
  typeof deviceCreationModalId
>;

export function DeviceCreationModal() {
  const { state, setState } = useModal(deviceCreationModalId);
  const [device, setDevice] = useState<CreateDeviceRequest>({
    name: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const api = useApi();

  const handleCreate = async () => {
    setIsLoading(true);

    if (device && device.name) {
      const res = await api.createDevice(device);
      if (res.ok) {
        notification.success({
          message: `${device.name} created succesfully`,
        });
      } else {
        notification.error({
          message: 'Failed to create device',
          description: res.message,
        });
      }
    }

    setIsLoading(false);
  };

  return (
    <ModalRoot open={state} onClose={() => setState(!state)} dismissable>
      <h3 className="mb-2 text-xl">Create device</h3>
      <Form className="contents" layout="vertical" onFinish={handleCreate}>
        <Form.Item label="Name" required>
          <Input
            required
            value={device?.name}
            onChange={e =>
              setDevice(prev => ({ ...prev, name: e.currentTarget.value }))
            }
          />
        </Form.Item>
        <Form.Item label="Description">
          <Input.TextArea
            autoSize={{
              minRows: 3,
              maxRows: 6,
            }}
            value={device?.description}
            onChange={e =>
              setDevice(prev => ({
                ...prev,
                description: e.currentTarget.value,
              }))
            }
          />
        </Form.Item>

        <Form.Item label="Critical value">
          <InputNumber
            className="!block !w-full"
            value={device.criticalValue}
            onChange={val =>
              setDevice(prev => ({ ...prev, criticalValue: val ?? undefined }))
            }
          />
        </Form.Item>

        <Form.Item label="Lower value">
          <InputNumber
            className="!block !w-full"
            value={device.lowerValue}
            onChange={val =>
              setDevice(prev => ({ ...prev, lowerValue: val ?? undefined }))
            }
          />
        </Form.Item>

        <Form.Item label="Delay (ms)">
          <InputNumber
            className="!block !w-full"
            value={device.delay}
            onChange={val =>
              setDevice(prev => ({ ...prev, delay: val ?? undefined }))
            }
          />
        </Form.Item>

        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setState(false);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button variant="primary" type="submit" disabled={isLoading}>
            {isLoading && <Spinner className="mr-1" />}
            Create
          </Button>
        </div>
      </Form>
    </ModalRoot>
  );
}

function ModalRoot({
  dismissable = false,
  ...props
}: {
  children?: ReactNode;
  open: boolean;
  onClose?: () => void;

  dismissable?: boolean;
}) {
  if (!props.open) return null;

  return (
    <div className="z-modal absolute top-0 left-0 flex h-full w-full items-center justify-center">
      <div
        className="absolute h-full w-full bg-black/15 backdrop-blur-xs"
        onClick={dismissable ? props.onClose : undefined}
      />
      <dialog
        open={props.open}
        className={clsx(
          'relative min-h-96 min-w-80 rounded-xl border border-black/10 bg-white p-4 md:min-w-[640px]'
        )}
      >
        {props.children}
      </dialog>
    </div>
  );
}
