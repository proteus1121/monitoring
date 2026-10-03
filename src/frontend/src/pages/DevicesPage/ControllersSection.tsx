import { useState } from 'react';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Input } from '@src/components/Input';
import { fromNow } from '@src/lib/readings';
import { useModal } from '@src/redux/modals/modals.hook';
import { AppAlertDialogModalId } from '@src/redux/modals/AlertDialog';
import { DeviceUpdatingModalId } from '@src/redux/modals/DeviceUpdatingModal';
import {
  Controller,
  Device,
  SensorModelInfo,
  useDeleteControllerMutation,
  useSyncControllerMutation,
  useUpdateControllerMutation,
} from '@src/redux/generatedApi';
import { BoardDiagram } from './BoardDiagram';

export function SetupHint({ userId }: { userId?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-blue-200 bg-blue-50 text-sm">
      <button
        type="button"
        className="flex w-full items-center gap-2 font-semibold"
        onClick={() => setOpen(!open)}
      >
        <Icon icon="lucide:info" className="size-4" />
        Connect a new board
        <span className="ml-2 font-normal text-slate-600">
          Your User ID:{' '}
          <span className="rounded bg-white px-2 py-0.5 font-mono font-semibold text-slate-900">
            {userId ?? '…'}
          </span>
        </span>
        <Icon
          icon="lucide:chevron-down"
          className={`ml-auto size-4 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
          <li>Flash the universal firmware to the board.</li>
          <li>
            Connect to the board Wi-Fi <b>ESP32-Setup</b> / <b>ESP8266-Setup</b> and open{' '}
            <b>http://192.168.4.1</b>.
          </li>
          <li>Enter your Wi-Fi and User ID, save. The board appears below.</li>
          <li>
            Add devices with <b>Add Device</b>: choose the board, the module and the pin.
          </li>
        </ol>
      )}
    </Card>
  );
}

/**
 * A board with its status, actions and wiring diagram.
 */
export function ControllerPanel(props: {
  controller: Controller;
  devices: Device[];
  models: SensorModelInfo[] | undefined;
}) {
  const { controller } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(controller.name ?? '');
  const [updateController] = useUpdateControllerMutation();
  const [syncController, { isLoading: isSyncing }] = useSyncControllerMutation();
  const [deleteController] = useDeleteControllerMutation();
  const { setState: confirm } = useModal(AppAlertDialogModalId);
  const { setState: editDevice } = useModal(DeviceUpdatingModalId);

  const id = controller.id!;

  const save = async () => {
    const res = await updateController({ id, controllerRequest: { name } });
    if (res.error) {
      notification.error({ message: 'Failed to rename board' });
      return;
    }
    setIsEditing(false);
  };

  const sync = async () => {
    const res = await syncController({ id });
    if (res.error) {
      notification.error({ message: 'Failed to send configuration' });
    } else {
      notification.success({ message: 'Configuration sent' });
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
          <Icon icon="lucide:cpu" className="size-5" />
        </div>
        {isEditing ? (
          <form
            className="flex min-w-[200px] flex-1 gap-2"
            onSubmit={e => {
              e.preventDefault();
              save();
            }}
          >
            <Input value={name} autoFocus onChange={e => setName(e.target.value)} />
            <Button size="icon" variant="ghost" type="submit">
              <Icon icon="lucide:check" />
            </Button>
          </form>
        ) : (
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{controller.name}</h3>
            <p className="truncate font-mono text-xs text-slate-500">
              {controller.hardwareId} · {controller.platform?.toUpperCase()} · fw{' '}
              {controller.firmwareVersion}
              {controller.ipAddress && ` · ${controller.ipAddress}`}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 text-white ${controller.online ? 'bg-green-500' : 'bg-gray-700'}`}
            title={controller.lastSeen ? `seen ${fromNow(controller.lastSeen)}` : undefined}
          >
            {controller.online ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span
            className={`rounded-full px-2 text-white ${controller.synced ? 'bg-blue-500' : 'bg-orange-500'}`}
            title={
              controller.synced
                ? 'The board runs the current configuration'
                : 'The board has not confirmed the latest configuration yet'
            }
          >
            {controller.synced ? 'CONFIG APPLIED' : 'CONFIG PENDING'}
          </span>
        </div>

        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" title="Send configuration again" disabled={isSyncing} onClick={sync}>
            <Icon icon="lucide:refresh-cw" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Rename"
            onClick={() => {
              setName(controller.name ?? '');
              setIsEditing(!isEditing);
            }}
          >
            <Icon icon="lucide:edit" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Delete board"
            onClick={() =>
              confirm({
                description:
                  'Devices of this board will be detached, not deleted. The board registers again when it reconnects.',
                callback: async () => {
                  await deleteController({ id });
                },
              })
            }
          >
            <Icon icon="lucide:trash-2" />
          </Button>
        </div>
      </div>

      {props.devices.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing is wired to this board yet. Add a device and choose this board.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <BoardDiagram
            controller={controller}
            devices={props.devices}
            models={props.models}
            onDeviceClick={editDevice}
          />
        </div>
      )}
    </Card>
  );
}
