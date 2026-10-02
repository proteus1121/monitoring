import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useState } from 'react';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Input } from '@src/components/Input';
import { H2 } from '@src/components/Text';
import { useModal } from '@src/redux/modals/modals.hook';
import { AppAlertDialogModalId } from '@src/redux/modals/AlertDialog';
import {
  Controller,
  useDeleteControllerMutation,
  useGetControllersQuery,
  useGetUserQuery,
  useSyncControllerMutation,
  useUpdateControllerMutation,
} from '@src/redux/generatedApi';

dayjs.extend(utc);

// boards say hello every minute, keep the list fresh
const POLLING_INTERVAL_MS = 30000;

export function ControllersSection() {
  const { data: controllers } = useGetControllersQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  const { data: me } = useGetUserQuery();

  return (
    <section className="mb-8 flex flex-col gap-4">
      <div>
        <H2>Controllers</H2>
        <p className="text-sm text-slate-600">
          Boards register themselves when they connect. Wire sensors to a board,
          add them below with the board, module and pin, and the configuration is
          sent to the board automatically.
        </p>
      </div>

      <SetupHint userId={me?.userId} />

      {controllers && controllers.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {controllers.map(controller => (
            <ControllerCard key={controller.id} controller={controller} />
          ))}
        </div>
      )}
    </section>
  );
}

function SetupHint({ userId }: { userId?: number }) {
  return (
    <Card className="flex flex-col gap-2 border-blue-200 bg-blue-50 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        <Icon icon="lucide:info" className="size-4" />
        Connect a new board
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-slate-700">
        <li>Flash the monitoring firmware to the ESP32 / ESP8266.</li>
        <li>
          Connect to the board Wi-Fi <b>ESP32-Setup</b> / <b>ESP8266-Setup</b>{' '}
          and open <b>http://192.168.4.1</b> (on ESP32 hold BOOT for 3 s to get
          there again).
        </li>
        <li>
          Enter your Wi-Fi and User ID{' '}
          <span className="rounded bg-white px-2 py-0.5 font-mono font-semibold">
            {userId ?? '…'}
          </span>
          , save.
        </li>
        <li>
          The board shows up here; add devices for it with <b>Add Device</b>.
        </li>
      </ol>
    </Card>
  );
}

function ControllerCard({ controller }: { controller: Controller }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(controller.name ?? '');
  const [updateController] = useUpdateControllerMutation();
  const [syncController, { isLoading: isSyncing }] = useSyncControllerMutation();
  const [deleteController] = useDeleteControllerMutation();
  const { setState: confirm } = useModal(AppAlertDialogModalId);

  const id = controller.id!;

  const save = async () => {
    const res = await updateController({
      id,
      controllerRequest: { name },
    });
    if (res.error) {
      notification.error({ message: 'Failed to rename controller' });
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
    <Card className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
          <Icon icon="lucide:cpu" className="size-5" />
        </div>
        {isEditing ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={e => {
              e.preventDefault();
              save();
            }}
          >
            <Input
              value={name}
              autoFocus
              onChange={e => setName(e.target.value)}
            />
            <Button size="icon" variant="ghost" type="submit">
              <Icon icon="lucide:check" />
            </Button>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{controller.name}</h3>
            <p className="truncate font-mono text-xs text-slate-500">
              {controller.hardwareId}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-2 text-white ${controller.online ? 'bg-green-500' : 'bg-gray-700'}`}
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
        <span className="rounded-full bg-gray-100 px-2 text-slate-700">
          {controller.deviceCount ?? 0} devices
        </span>
      </div>

      <div className="text-xs text-slate-600">
        {controller.platform?.toUpperCase()} · fw {controller.firmwareVersion}
        {controller.ipAddress && <> · {controller.ipAddress}</>}
        {controller.lastSeen && (
          // server sends UTC without a zone
          <> · seen {dayjs.utc(controller.lastSeen).fromNow()}</>
        )}
      </div>

      <div className="flex justify-end gap-1 border-t pt-2">
        <Button
          size="icon"
          variant="ghost"
          title="Send configuration again"
          disabled={isSyncing}
          onClick={sync}
        >
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
          title="Delete"
          onClick={() =>
            confirm({
              description:
                'Devices of this controller will be detached. The board registers again when it reconnects.',
              callback: async () => {
                await deleteController({ id });
              },
            })
          }
        >
          <Icon icon="lucide:trash-2" />
        </Button>
      </div>
    </Card>
  );
}
