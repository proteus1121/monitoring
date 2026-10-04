import { useState } from 'react';
import { Link } from 'react-router-dom';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Input } from '@src/components/Input';
import { fromNow } from '@src/lib/readings';
import { errorMessage } from '@src/redux/helpers';
import {
  ControllerWithRole,
  useScanControllerMutation,
} from '@src/redux/controllersApi';
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
import { DisplayModalId } from '@src/redux/modals/DisplayModal';
import { ScanPanel } from './ScanPanel';
import { BoardFirmware } from './BoardFirmware';

export function SetupHint() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-blue-200 bg-blue-50 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <Icon icon="lucide:cpu" className="size-4" />
          Connect a new board
        </div>
        <div className="flex-1 text-slate-600">Flash it, give it your Wi-Fi, then sign in from its page.</div>
        <button
          type="button"
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
          onClick={() => setOpen(!open)}
        >
          How
          <Icon icon="lucide:chevron-down" className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
          <li>
            Flash the universal firmware to the board over USB (download it on the{' '}
            <Link to="/settings/library" className="underline">Library</Link> page).
          </li>
          <li>
            Join the board Wi-Fi <b>ESP32-Setup</b> / <b>ESP8266-Setup</b>, open <b>http://192.168.4.1</b> and
            enter your home Wi-Fi.
          </li>
          <li>
            Switch back to your Wi-Fi and open the board's address shown on its display and setup page, e.g.{' '}
            <b>http://192.168.1.150</b>. Press <b>Sign in</b> and sign in here: with a password, Google or
            GitHub. The board gets its own login to the server, restarts and appears below.
          </li>
          <li>
            Add devices with <b>Add Device</b>: choose the board, the module and the pin (see{' '}
            <Link to="/settings/library" className="underline">supported modules</Link>). The display is set on
            the board card.
          </li>
          <li>Settings page again later: hold FLASH / BOOT for 3 s, a short press leaves it. On the readings screen a short press flips the pages.</li>
        </ol>
      )}
    </Card>
  );
}

const hasDisplay = (model?: string) => !!model && model !== 'NONE';

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
  const [scanController, { isLoading: isScanStarting }] = useScanControllerMutation();
  const [showScan, setShowScan] = useState(false);
  const isOwner = !(controller as ControllerWithRole).role || (controller as ControllerWithRole).role === 'OWNER';
  const { setState: confirm } = useModal(AppAlertDialogModalId);
  const { setState: editDevice } = useModal(DeviceUpdatingModalId);
  const { setState: openDisplay } = useModal(DisplayModalId);

  const id = controller.id!;

  const save = async () => {
    const res = await updateController({ id, controllerRequest: { name } });
    if (res.error) {
      notification.error({ message: 'Failed to rename board', description: errorMessage(res.error) });
      return;
    }
    setIsEditing(false);
  };

  const scan = async () => {
    const res = await scanController({ id });
    if ('error' in res) {
      notification.error({ message: 'Could not start the scan', description: errorMessage(res.error) });
      return;
    }
    setShowScan(true);
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

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <BoardFirmware controller={controller as ControllerWithRole} />
          {isOwner && (
            <Button
              size="sm"
              variant="secondary"
              title="Look for modules on the free pins"
              disabled={isScanStarting || !controller.online}
              onClick={scan}
            >
              <Icon icon="lucide:scan-search" />
              Scan board
            </Button>
          )}
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
                  'Devices of this board are detached, not deleted. The board is unlinked from your account and loses its login to the server; to use it again, sign in from its page.',
                callback: async () => {
                  const res = await deleteController({ id });
                  if ('error' in res) {
                    notification.error({ message: 'Failed to delete board', description: errorMessage(res.error) });
                  } else {
                    notification.success({ message: `Deleted ${controller.name}` });
                  }
                },
              })
            }
          >
            <Icon icon="lucide:trash-2" />
          </Button>
        </div>
      </div>

      {showScan && <ScanPanel controller={controller as ControllerWithRole} onClose={() => setShowScan(false)} />}

      {props.devices.length === 0 && (
        <p className="text-sm text-slate-500">
          No sensors on this board yet: “Add Device” and choose the module you wired.
        </p>
      )}
      {(props.devices.length > 0 || hasDisplay((controller as ControllerWithRole).display?.model)) && (
        <div className="overflow-x-auto">
          <BoardDiagram
            controller={controller}
            devices={props.devices}
            models={props.models}
            onDeviceClick={editDevice}
            onDisplayClick={() => openDisplay({ controllerId: id })}
          />
        </div>
      )}
    </Card>
  );
}
