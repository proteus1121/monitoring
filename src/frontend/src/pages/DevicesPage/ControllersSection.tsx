import { useState } from 'react';
import { Link } from 'react-router-dom';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Input } from '@src/components/Input';
import { fromNow } from '@src/lib/readings';
import { Spinner } from '@src/components/Spinner';
import { errorMessage } from '@src/redux/helpers';
import {
  ControllerWithRole,
  usePairControllerMutation,
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
import { DisplaySettingsPanel } from './DisplaySettingsPanel';
import { ScanPanel } from './ScanPanel';

/**
 * Code input that links the board showing it to the current user. Used on the Devices page and on /pair,
 * the page the board's display and setup page link to.
 */
export function PairBoardForm(props: { initialCode?: string; onPaired?: (controller: Controller) => void }) {
  const [code, setCode] = useState(props.initialCode ?? '');
  const [pair, { isLoading }] = usePairControllerMutation();

  const submit = async () => {
    const res = await pair({ code: code.trim() });
    if ('error' in res) {
      notification.error({ message: 'Could not link the board', description: errorMessage(res.error) });
      return;
    }
    notification.success({
      message: `Board ${res.data.name ?? res.data.hardwareId} linked`,
      description: 'It restarts and comes online in a few seconds.',
    });
    setCode('');
    props.onPaired?.(res.data);
  };

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <Input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="Code from the board, e.g. 4F7K2Q"
        maxLength={12}
        autoComplete="off"
        className="w-[240px] font-mono tracking-widest"
      />
      <Button type="submit" disabled={isLoading || code.trim().length < 4}>
        {isLoading ? <Spinner /> : <Icon icon="lucide:link" />}
        Link board
      </Button>
    </form>
  );
}

export function SetupHint() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="border-blue-200 bg-blue-50 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <Icon icon="lucide:cpu" className="size-4" />
          Connect a new board
        </div>
        <div className="flex-1">
          <PairBoardForm />
        </div>
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
          <li>Flash the universal firmware to the board.</li>
          <li>
            Join the board Wi-Fi <b>ESP32-Setup</b> / <b>ESP8266-Setup</b>, open <b>http://192.168.4.1</b> and
            enter your home Wi-Fi.
          </li>
          <li>
            The board connects and shows a code on its display and setup page. Open the link next to it (or
            enter the code here) and sign in: with a password, Google or GitHub. The board appears below
            right away.
          </li>
          <li>
            Add devices with <b>Add Device</b>: choose the board, the module and the pin (see{' '}
            <Link to="/settings/modules" className="underline">supported modules</Link>). The display is set on
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

        <div className="ml-auto flex gap-1">
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
                  'Devices of this board are detached, not deleted. The board is unlinked from your account and shows a new pairing code.',
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

      <DisplaySettingsPanel
        controller={controller as ControllerWithRole}
        devices={props.devices}
        models={props.models}
      />

      {props.devices.length === 0 && (
        <p className="text-sm text-slate-500">
          No sensors on this board yet. Add a device and choose this board.
        </p>
      )}
      {(props.devices.length > 0 || hasDisplay((controller as ControllerWithRole).display?.model)) && (
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
