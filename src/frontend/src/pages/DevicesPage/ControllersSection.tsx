import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Input } from '@src/components/Input';
import { fromNow } from '@src/lib/readings';
import { errorMessage } from '@src/redux/helpers';
import { boardModelsFor } from '@src/lib/hardware';
import { useTexts } from '@src/lib/lang';
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
  BoardModel,
  useScanControllerMutation,
  useUpdateBoardModelMutation,
} from '@src/redux/generatedApi';
import { BoardDiagram } from './BoardDiagram';
import { DisplayModalId } from '@src/redux/modals/DisplayModal';
import { ScanPanel } from './ScanPanel';
import { BoardFirmware } from './BoardFirmware';

const library = (text: string) => (
  <Link to="/settings/library" className="underline">
    {text}
  </Link>
);

const TEXTS = {
  uk: {
    connect: 'Підключити нову плату',
    connectNote: 'Прошийте її, вкажіть свій Wi-Fi і увійдіть з її сторінки.',
    how: 'Як',
    steps: [
      <>Один раз прошийте універсальну прошивку через USB (файли на сторінці {library('Бібліотека')}).</>,
      <>
        Під’єднайтеся до Wi-Fi плати <b>ESP8266-Setup</b> / <b>ESP32-Setup</b>, відкрийте <b>http://192.168.4.1</b> і
        вкажіть домашній Wi-Fi.
      </>,
      <>
        Натисніть <b>Sign in</b> і увійдіть тут: паролем, через Google або GitHub. На ESP8266 це працює просто в мережі
        плати; на ESP32 поверніться до свого Wi-Fi й відкрийте адресу плати з її дисплея. Плата отримає власний логін до
        сервера, перезапуститься й з’явиться нижче.
      </>,
      <>
        Додайте пристрої кнопкою <b>Додати пристрій</b>: плата, модуль і пін (див. {library('підтримувані модулі')}).
        Дисплей налаштовується на картці плати.
      </>,
      <>
        Сторінка налаштування пізніше: утримуйте FLASH / BOOT 3 с, коротке натискання виходить із неї. На екрані з
        показниками коротке натискання гортає сторінки.
      </>,
    ],
    renameFailed: 'Не вдалося перейменувати плату',
    scanFailed: 'Не вдалося почати сканування',
    boardFailed: 'Не вдалося змінити тип плати',
    syncFailed: 'Не вдалося надіслати налаштування',
    synced: 'Налаштування надіслано',
    boardType: 'Тип плати, для схеми',
    seen: (when: string) => `на зв’язку ${when}`,
    online: 'ОНЛАЙН',
    offline: 'ОФЛАЙН',
    applied: 'НАЛАШТУВАННЯ ЗАСТОСОВАНО',
    pending: 'НАЛАШТУВАННЯ ОЧІКУЄ',
    appliedHint: 'Плата працює з поточними налаштуваннями',
    pendingHint: 'Плата ще не підтвердила останні налаштування',
    scanHint: 'Пошук модулів на вільних пінах',
    scan: 'Сканувати плату',
    resend: 'Надіслати налаштування ще раз',
    rename: 'Перейменувати',
    deleteBoard: 'Видалити плату',
    deleteConfirm:
      'Пристрої цієї плати буде від’єднано, а не видалено. Плату буде відв’язано від акаунта, і вона втратить логін до сервера; щоб використати її знову, увійдіть з її сторінки.',
    deleteFailed: 'Не вдалося видалити плату',
    deleted: (name: string) => `Видалено ${name}`,
    noSensors: 'На цій платі ще немає датчиків: натисніть «Додати пристрій» і виберіть під’єднаний модуль.',
  },
  en: {
    connect: 'Connect a new board',
    connectNote: 'Flash it, give it your Wi-Fi, then sign in from its page.',
    how: 'How',
    steps: [
      <>Flash the universal firmware to the board over USB once (files on the {library('Library')} page).</>,
      <>
        Join the board Wi-Fi <b>ESP8266-Setup</b> / <b>ESP32-Setup</b>, open <b>http://192.168.4.1</b> and enter
        your home Wi-Fi.
      </>,
      <>
        Press <b>Sign in</b> and sign in here: with a password, Google or GitHub. On ESP8266 this works right on the
        board's network; on ESP32 switch back to your Wi-Fi and open the board's address from its display. The board
        gets its own login to the server, restarts and appears below.
      </>,
      <>
        Add devices with <b>Add Device</b>: choose the board, the module and the pin (see{' '}
        {library('supported modules')}). The display is set on the board card.
      </>,
      <>
        Setup page again later: hold FLASH / BOOT for 3 s, a short press leaves it. On the readings screen a short
        press flips the pages.
      </>,
    ],
    renameFailed: 'Failed to rename board',
    scanFailed: 'Could not start the scan',
    boardFailed: 'Could not change the board',
    syncFailed: 'Failed to send configuration',
    synced: 'Configuration sent',
    boardType: 'Board type, for the diagram',
    seen: (when: string) => `seen ${when}`,
    online: 'ONLINE',
    offline: 'OFFLINE',
    applied: 'CONFIG APPLIED',
    pending: 'CONFIG PENDING',
    appliedHint: 'The board runs the current configuration',
    pendingHint: 'The board has not confirmed the latest configuration yet',
    scanHint: 'Look for modules on the free pins',
    scan: 'Scan board',
    resend: 'Send configuration again',
    rename: 'Rename',
    deleteBoard: 'Delete board',
    deleteConfirm:
      'Devices of this board are detached, not deleted. The board is unlinked from your account and loses its login to the server; to use it again, sign in from its page.',
    deleteFailed: 'Failed to delete board',
    deleted: (name: string) => `Deleted ${name}`,
    noSensors: 'No sensors on this board yet: “Add Device” and choose the module you wired.',
  },
};

export function SetupHint() {
  const [open, setOpen] = useState(false);
  const t = useTexts(TEXTS);
  return (
    <Card className="border-blue-200 bg-blue-50 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <Icon icon="lucide:cpu" className="size-4" />
          {t.connect}
        </div>
        <div className="flex-1 text-slate-600">{t.connectNote}</div>
        <button
          type="button"
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
          onClick={() => setOpen(!open)}
        >
          {t.how}
          <Icon icon="lucide:chevron-down" className={`size-4 transition ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
          {t.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
    </Card>
  );
}

const hasDisplay = (model?: string) => !!model && model !== 'NONE';

/**
 * A board with its status and actions; its wiring diagram on the left and `sensors` (the table of what is wired
 * to it) on the right, one above the other on narrow screens.
 */
export function ControllerPanel(props: {
  controller: Controller;
  devices: Device[];
  models: SensorModelInfo[] | undefined;
  sensors?: ReactNode;
}) {
  const { controller } = props;
  const t = useTexts(TEXTS);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(controller.name ?? '');
  const [updateController] = useUpdateControllerMutation();
  const [syncController, { isLoading: isSyncing }] = useSyncControllerMutation();
  const [deleteController] = useDeleteControllerMutation();
  const [scanController, { isLoading: isScanStarting }] = useScanControllerMutation();
  const [showScan, setShowScan] = useState(false);
  const [updateBoardModel, { isLoading: isBoardModelSaving }] = useUpdateBoardModelMutation();
  const isOwner = !controller.role || controller.role === 'OWNER';
  const { setState: confirm } = useModal(AppAlertDialogModalId);
  const { setState: editDevice } = useModal(DeviceUpdatingModalId);
  const { setState: openDisplay } = useModal(DisplayModalId);

  const id = controller.id!;

  const save = async () => {
    const res = await updateController({ id, controllerRequest: { name } });
    if (res.error) {
      notification.error({ message: t.renameFailed, description: errorMessage(res.error) });
      return;
    }
    setIsEditing(false);
  };

  const scan = async () => {
    const res = await scanController({ id });
    if ('error' in res) {
      notification.error({ message: t.scanFailed, description: errorMessage(res.error) });
      return;
    }
    setShowScan(true);
  };

  const boardModel = controller.boardModel;
  const boardModels = boardModelsFor(controller);
  const changeBoardModel = async (value: BoardModel) => {
    const res = await updateBoardModel({ id, boardModelRequest: { boardModel: value } });
    if ('error' in res) {
      notification.error({ message: t.boardFailed, description: errorMessage(res.error) });
    }
  };

  const sync = async () => {
    const res = await syncController({ id });
    if (res.error) {
      notification.error({ message: t.syncFailed });
    } else {
      notification.success({ message: t.synced });
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
          {isOwner && boardModels.length > 1 && (
            // the firmware only knows the chip: NodeMCU and D1 mini are told apart here
            <select
              value={boardModel ?? boardModels[0].value}
              disabled={isBoardModelSaving}
              onChange={e => changeBoardModel(e.target.value as BoardModel)}
              title={t.boardType}
              className="rounded-md border border-black/15 bg-white px-2 py-0.5 text-xs text-slate-700"
            >
              {boardModels.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          )}
          <span
            className={`rounded-full px-2 text-white ${controller.online ? 'bg-green-500' : 'bg-gray-700'}`}
            title={controller.lastSeen ? t.seen(fromNow(controller.lastSeen)) : undefined}
          >
            {controller.online ? t.online : t.offline}
          </span>
          <span
            className={`rounded-full px-2 text-white ${controller.synced ? 'bg-blue-500' : 'bg-orange-500'}`}
            title={controller.synced ? t.appliedHint : t.pendingHint}
          >
            {controller.synced ? t.applied : t.pending}
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <BoardFirmware controller={controller} />
          {isOwner && (
            <Button
              size="sm"
              variant="secondary"
              title={t.scanHint}
              disabled={isScanStarting || !controller.online}
              onClick={scan}
            >
              <Icon icon="lucide:scan-search" />
              {t.scan}
            </Button>
          )}
          <Button size="icon" variant="ghost" title={t.resend} disabled={isSyncing} onClick={sync}>
            <Icon icon="lucide:refresh-cw" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title={t.rename}
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
            title={t.deleteBoard}
            onClick={() =>
              confirm({
                description: t.deleteConfirm,
                callback: async () => {
                  const res = await deleteController({ id });
                  if ('error' in res) {
                    notification.error({ message: t.deleteFailed, description: errorMessage(res.error) });
                  } else {
                    notification.success({ message: t.deleted(controller.name ?? '') });
                  }
                },
              })
            }
          >
            <Icon icon="lucide:trash-2" />
          </Button>
        </div>
      </div>

      {showScan && <ScanPanel controller={controller} onClose={() => setShowScan(false)} />}

      <div className="grid gap-4 xl:grid-cols-2 xl:items-start">
        <div className="min-w-0 overflow-x-auto">
          {props.devices.length > 0 || hasDisplay(controller.display?.model) ? (
            <BoardDiagram
              controller={controller}
              devices={props.devices}
              models={props.models}
              onDeviceClick={editDevice}
              onDisplayClick={() => openDisplay({ controllerId: id })}
            />
          ) : (
            <p className="text-sm text-slate-500">
              {t.noSensors}
            </p>
          )}
        </div>
        {props.sensors && <div className="min-w-0">{props.sensors}</div>}
      </div>
    </Card>
  );
}
