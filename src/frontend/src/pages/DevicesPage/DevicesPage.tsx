import { useEffect, useMemo, useState } from 'react';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import clsx from 'clsx';
import { ModuleCreationModalId } from '@src/redux/modals/ModuleCreationModal';
import { DisplayModalId } from '@src/redux/modals/DisplayModal';
import { DeviceUpdatingModalId, useDeleteDevice } from '@src/redux/modals/DeviceUpdatingModal';
import { AppAlertDialogModalId } from '@src/redux/modals/AlertDialog';
import { useModal } from '@src/redux/modals/modals.hook';
import { errorMessage } from '@src/redux/helpers';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { Loader } from '@src/components/Loader';
import { PageLayout } from '@src/layouts/PageLayout';
import { DEVICE_TYPE_LABELS, DISPLAY_PIN_NAMES, deviceStatusLabel, getPinLabel, pinPlatform } from '@src/lib/hardware';
import { useTexts } from '@src/lib/lang';
import { ModuleArt } from '@src/components/ModuleArt';
import { formatReading, fromNow } from '@src/lib/readings';
import {
  Controller,
  Device,
  LatestReading,
  SensorModelInfo,
  useDeleteDeviceMutation,
  useGetAllDevicesQuery,
  useGetControllersQuery,
  useGetLatestReadingsQuery,
  useGetSensorModelsQuery,
  useGetUserQuery,
  useSendCommandMutation,
  useUpdateDisplayMutation,
} from '@src/redux/generatedApi';
import { ControllerPanel, SetupHint } from './ControllersSection';
import { isUpdating } from './BoardFirmware';

const POLLING_INTERVAL_MS = 30000;
const PENDING_POLLING_INTERVAL_MS = 3000;

const FORECAST_LABELS: Record<string, string> = {
  ARIMA: 'ARIMA',
  KALMAN: 'Kalman',
  XGBOOST: 'XGBoost',
  TRANSFORMER: 'Transformer',
};

const TEXTS = {
  uk: {
    loadFailed: 'Не вдалося завантажити пристрої',
    title: 'Мої пристрої',
    description: 'Ваші плати, під’єднані до них датчики й налаштування кожного пристрою',
    addDevice: 'Додати пристрій',
    boards: 'Плати',
    noBoards: 'Плат ще немає. Прошийте плату й увійдіть з її сторінки, як описано вище.',
    unwired: 'Не під’єднані до плати',
    unwiredNote: 'Ці пристрої не отримують налаштувань: відкрийте пристрій і виберіть плату, модуль і пін.',
    deleteAll: 'Видалити всі',
    deleteAllConfirm: (n: number) => `Видалити ${n} не під’єднаних пристроїв разом з історією?`,
    deleteAllFailed: (n: number) => `Не вдалося видалити пристроїв: ${n}`,
    deletedAll: (n: number) => `Видалено пристроїв: ${n}`,
    noDevices: 'Пристроїв ще немає.',
    device: 'Пристрій',
    modulePin: 'Модуль · пін',
    boardModulePin: 'Плата · модуль · пін',
    lastValue: 'Останнє значення',
    status: 'Стан',
    forecast: 'Прогноз',
    edit: 'Редагувати',
    board: 'Плата',
    noModule: 'без модуля',
    notWired: 'не під’єднано',
    configure: 'Налаштувати',
    delete: 'Видалити',
    display: 'Дисплей',
    showsReadings: 'показує показники',
    notFoundHint: 'Плата його не знайшла: перевірте під’єднання й модель',
    notFound: 'НЕ ЗНАЙДЕНО',
    found: 'OK',
    unknown: 'НЕВІДОМО',
    remove: 'Прибрати',
    removeDisplay: (board: string) => `Прибрати дисплей плати ${board}? Плата перезапуститься без екрана.`,
    removeFailed: 'Не вдалося прибрати дисплей',
    commandFailed: 'Не вдалося надіслати команду',
    on: 'Увімк.',
    off: 'Вимк.',
  },
  en: {
    loadFailed: 'Failed to load devices',
    title: 'My devices',
    description: 'Your linked boards, the sensors wired to them and the configuration of every device',
    addDevice: 'Add Device',
    boards: 'Boards',
    noBoards: 'No boards yet. Flash a board and sign in from its page, as described above.',
    unwired: 'Not wired to a board',
    unwiredNote: 'These devices do not receive configuration; edit one and choose a board, module and pin.',
    deleteAll: 'Delete all',
    deleteAllConfirm: (n: number) => `Delete ${n} unwired devices with their history?`,
    deleteAllFailed: (n: number) => `Failed to delete ${n} devices`,
    deletedAll: (n: number) => `Deleted ${n} devices`,
    noDevices: 'No devices yet.',
    device: 'Device',
    modulePin: 'Module · pin',
    boardModulePin: 'Board · module · pin',
    lastValue: 'Last value',
    status: 'Status',
    forecast: 'Forecast',
    edit: 'Edit',
    board: 'Board',
    noModule: 'no module',
    notWired: 'not wired',
    configure: 'Configure',
    delete: 'Delete',
    display: 'Display',
    showsReadings: 'shows the readings',
    notFoundHint: 'The board did not find it: check the wiring and the model',
    notFound: 'NOT FOUND',
    found: 'OK',
    unknown: 'UNKNOWN',
    remove: 'Remove',
    removeDisplay: (board: string) => `Remove the display of ${board}? The board restarts without a screen.`,
    removeFailed: 'Failed to remove the display',
    commandFailed: 'Failed to send command',
    on: 'On',
    off: 'Off',
  },
};

const DevicesPage = () => {
  const t = useTexts(TEXTS);
  const { data: devices, isLoading, error } = useGetAllDevicesQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  // an online board confirms a new configuration within seconds, poll faster until it does
  const [waitingForBoard, setWaitingForBoard] = useState(false);
  const { data: controllers } = useGetControllersQuery(undefined, {
    pollingInterval: waitingForBoard ? PENDING_POLLING_INTERVAL_MS : POLLING_INTERVAL_MS,
  });
  useEffect(() => {
    setWaitingForBoard(
      Boolean(controllers?.some(c => (c.online && !c.synced) || isUpdating(c)))
    );
  }, [controllers]);
  const { data: models } = useGetSensorModelsQuery();
  const { data: readings } = useGetLatestReadingsQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  const { setState: openCreation } = useModal(ModuleCreationModalId);

  useEffect(() => {
    if (error) {
      notification.error({ message: `${t.loadFailed}: ${JSON.stringify(error)}` });
    }
  }, [error]);

  const readingByDevice = useMemo(
    () => new Map((readings ?? []).map(r => [r.deviceId, r])),
    [readings]
  );

  if (isLoading) {
    return <Loader />;
  }

  const unwired = (devices ?? []).filter(d => !d.controllerId);

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>{t.title}</PageHeaderTitle>
          <PageHeaderDescription>{t.description}</PageHeaderDescription>
        </div>
        <Button onClick={() => openCreation(true)} className="ml-2 shrink-0">
          <Icon icon="lucide:plus" className="size-4" />
          {t.addDevice}
        </Button>
      </PageHeader>

      <SetupHint />

      <section className="space-y-4">
        <h2 className="font-semibold">{t.boards}</h2>
        {controllers?.length ? (
          controllers.map(controller => (
            <ControllerPanel
              key={controller.id}
              controller={controller}
              devices={(devices ?? []).filter(
                d => d.controllerId === controller.id && d.sensorModel
              )}
              models={models}
              sensors={
                <DevicesTable
                  compact
                  devices={(devices ?? []).filter(d => d.controllerId === controller.id)}
                  controllers={[controller]}
                  models={models}
                  readings={readingByDevice}
                />
              }
            />
          ))
        ) : (
          <Card className="text-sm text-slate-500">
            {t.noBoards}
          </Card>
        )}
      </section>

      {unwired.length > 0 && <UnwiredSection devices={unwired} />}

    </PageLayout>
  );
};

export default DevicesPage;

/** Devices without a board, highlighted as something to fix, with a bulk delete of the ones the user owns. */
function UnwiredSection({ devices }: { devices: Device[] }) {
  const t = useTexts(TEXTS);
  const { data: me } = useGetUserQuery();
  const [deleteDevice] = useDeleteDeviceMutation();
  const { setState: confirm } = useModal(AppAlertDialogModalId);
  // shared devices stay: only their owner may delete them
  const owned = devices.filter(d =>
    d.userDevices?.some(u => u.userId === me?.userId && u.role === 'OWNER')
  );

  const deleteAll = () =>
    confirm({
      description: t.deleteAllConfirm(owned.length),
      callback: async () => {
        // one after another: each delete also clears the device's readings and incidents
        const results = [];
        for (const d of owned) {
          results.push(await deleteDevice({ id: d.id! }));
        }
        const failed = results.filter(r => 'error' in r);
        if (failed.length) {
          notification.error({
            message: t.deleteAllFailed(failed.length),
            description: errorMessage((failed[0] as { error: unknown }).error),
          });
        }
        if (failed.length < results.length) {
          notification.success({ message: t.deletedAll(results.length - failed.length) });
        }
      },
    });

  return (
    <section className="space-y-3 rounded-xl border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <Icon icon="lucide:triangle-alert" className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-amber-900">
            {t.unwired}
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{devices.length}</span>
          </h2>
          <p className="text-sm text-amber-800">{t.unwiredNote}</p>
        </div>
        {owned.length > 0 && (
          <Button size="sm" variant="destructive" className="shrink-0" onClick={deleteAll}>
            <Icon icon="lucide:trash-2" className="size-4" />
            {t.deleteAll}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {devices.map(device => (
          <UnwiredChip key={device.id} device={device} />
        ))}
      </div>
    </section>
  );
}

function UnwiredChip({ device }: { device: Device }) {
  const { setState: edit } = useModal(DeviceUpdatingModalId);
  return (
    <button
      type="button"
      onClick={() => edit(device)}
      className="flex items-center gap-2 rounded-full border border-dashed border-amber-400 bg-white px-3 py-1.5 text-sm hover:border-amber-600"
    >
      <DeviceIcon type={device.type} className="size-4 text-slate-500" />
      {device.name}
      <Icon icon="lucide:plug-zap" className="size-4 text-slate-400" />
    </button>
  );
}

/**
 * Devices with their last value, status and actions; `compact` lists the devices and display of one board in
 * its card, without the board and forecast columns.
 */
function DevicesTable(props: {
  devices: Device[];
  controllers?: Controller[];
  models?: SensorModelInfo[];
  readings: Map<number, LatestReading>;
  compact?: boolean;
}) {
  const compact = !!props.compact;
  const t = useTexts(TEXTS);
  const deleteDevice = useDeleteDevice();
  const { setState: confirm } = useModal(AppAlertDialogModalId);
  const { setState: edit } = useModal(DeviceUpdatingModalId);
  const { setState: openDisplay } = useModal(DisplayModalId);
  const [updateDisplay] = useUpdateDisplayMutation();
  // a board's display is listed like a device
  const displays = (props.controllers ?? []).filter(
    c => c.display && c.display.model !== 'NONE'
  );

  if (props.devices.length === 0 && displays.length === 0) {
    return compact ? null : <Card className="text-sm text-slate-500">{t.noDevices}</Card>;
  }

  return (
    <div className={clsx('overflow-x-auto', compact ? 'rounded-lg border border-black/10' : 'rounded-xl border border-black/10 bg-white')}>
      <table className={clsx('w-full text-left text-sm', compact ? 'min-w-[480px]' : 'min-w-[760px]')}>
        <thead className="border-b border-black/10 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">{t.device}</th>
            <th className="px-4 py-2 font-medium">{compact ? t.modulePin : t.boardModulePin}</th>
            <th className="px-4 py-2 font-medium">{t.lastValue}</th>
            <th className="px-4 py-2 font-medium">{t.status}</th>
            {!compact && <th className="px-4 py-2 font-medium">{t.forecast}</th>}
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {props.devices.map(device => {
            const controller = props.controllers?.find(c => c.id === device.controllerId);
            const model = props.models?.find(m => m.model === device.sensorModel);
            const reading = props.readings.get(device.id!);
            const value = formatReading(device, reading?.value);
            return (
              <tr
                key={device.id}
                className="cursor-pointer border-b border-black/5 last:border-b-0 hover:bg-gray-50"
                title={t.edit}
                onClick={() => edit(device)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {device.sensorModel ? (
                      <ModuleArt module={device.sensorModel} showLabels={false} className="h-6 w-8 shrink-0" />
                    ) : (
                      <DeviceIcon type={device.type} className="size-4 text-slate-500" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium">{device.name}</div>
                      <div className="text-xs text-slate-500">
                        {device.type ? DEVICE_TYPE_LABELS[device.type] : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {device.controllerId ? (
                    <>
                      {!compact && <>{controller?.name ?? `${t.board} #${device.controllerId}`} · </>}
                      {model?.label ?? device.sensorModel ?? t.noModule} ·{' '}
                      {getPinLabel(pinPlatform(controller), device.pin)}
                      {device.secondaryPin !== undefined && device.secondaryPin !== null &&
                        ` / ${getPinLabel(pinPlatform(controller), device.secondaryPin)}`}
                    </>
                  ) : (
                    <span className="text-slate-400">{t.notWired}</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className="font-medium tabular-nums">{value.value}</span>{' '}
                  <span className="text-xs text-slate-500">{value.unit}</span>
                  {reading && (
                    <div className="text-xs text-slate-400">{fromNow(reading.timestamp)}</div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs text-white',
                      getColorByStatus(device.status)
                    )}
                  >
                    {deviceStatusLabel(device.status)}
                  </span>
                </td>
                {!compact && <td className="px-4 py-2.5 text-slate-600">
                  {device.forecastModels?.length ? (
                    device.forecastModels.map(model => {
                      const mae = device.forecastScores?.[model]?.mae;
                      return (
                        <div key={model}>
                          {FORECAST_LABELS[model]}
                          {mae !== undefined && mae !== null && (
                            <span className="ml-1 text-xs text-slate-400">MAE {mae.toFixed(2)}</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>}
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    {model?.output && device.controllerId && <RelayControls deviceId={device.id!} />}
                    <Button size="icon" variant="ghost" title={t.configure} onClick={() => edit(device)}>
                      <Icon icon="lucide:settings-2" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={t.delete}
                      onClick={() => deleteDevice(device)}
                    >
                      <Icon icon="lucide:trash-2" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {displays.map(board => {
            const display = board.display!;
            const pins = display.pins
              .map((gpio, i) => `${DISPLAY_PIN_NAMES[display.model][i]} ${getPinLabel(pinPlatform(board), gpio)}`)
              .join(' / ');
            return (
              <tr
                key={`display-${board.id}`}
                className="cursor-pointer border-b border-black/5 last:border-b-0 hover:bg-gray-50"
                title={t.edit}
                onClick={() => openDisplay({ controllerId: board.id! })}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <ModuleArt module={display.model} showLabels={false} className="h-6 w-8 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">{t.display}</div>
                      <div className="text-xs text-slate-500">{display.model}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {!compact && <>{board.name} · </>}
                  {display.model} · {pins}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{t.showsReadings}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs text-white',
                      board.displayFound === false ? 'bg-orange-500' : board.displayFound ? 'bg-green-500' : 'bg-gray-400'
                    )}
                    title={board.displayFound === false ? t.notFoundHint : undefined}
                  >
                    {board.displayFound === false ? t.notFound : board.displayFound ? t.found : t.unknown}
                  </span>
                </td>
                {!compact && <td className="px-4 py-2.5 text-slate-400">—</td>}
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={t.configure}
                      onClick={() => openDisplay({ controllerId: board.id! })}
                    >
                      <Icon icon="lucide:settings-2" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={t.remove}
                      onClick={() =>
                        confirm({
                          description: t.removeDisplay(board.name ?? ''),
                          callback: async () => {
                            const res = await updateDisplay({
                              id: board.id!,
                              displayRequest: { model: 'NONE', pins: [], flip: false },
                            });
                            if ('error' in res) {
                              notification.error({
                                message: t.removeFailed,
                                description: errorMessage(res.error),
                              });
                            }
                          },
                        })
                      }
                    >
                      <Icon icon="lucide:trash-2" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RelayControls({ deviceId }: { deviceId: number }) {
  const [sendCommand, { isLoading }] = useSendCommandMutation();
  const t = useTexts(TEXTS);

  const send = async (value: number) => {
    const res = await sendCommand({ id: deviceId, deviceCommandRequest: { value } });
    if (res.error) {
      notification.error({ message: t.commandFailed, description: JSON.stringify(res.error) });
    }
  };

  return (
    <div className="mr-1 flex gap-1">
      <Button size="sm" disabled={isLoading} onClick={() => send(1)}>
        {t.on}
      </Button>
      <Button size="sm" variant="secondary" disabled={isLoading} onClick={() => send(0)}>
        {t.off}
      </Button>
    </div>
  );
}

export function DeviceIcon({ type, className }: { type: Device['type']; className?: string }) {
  let icon = 'lucide:microchip';

  if (type === 'TEMPERATURE') icon = 'lucide:thermometer';
  if (type === 'SMOKE') icon = 'lucide:cloud';
  if (type === 'FLAME') icon = 'lucide:flame';
  if (type === 'LIGHT') icon = 'lucide:lightbulb';
  if (type === 'HUMIDITY') icon = 'lucide:droplet';
  if (type === 'PRESSURE') icon = 'lucide:gauge';
  if (type === 'MOTION') icon = 'lucide:footprints';
  if (type === 'LPG' || type === 'CH4') icon = 'lucide:fuel';
  if (type === 'RELAY') icon = 'lucide:power';
  if (type === 'DIGITAL') icon = 'lucide:toggle-left';
  if (type === 'ANALOG') icon = 'lucide:activity';

  return <Icon icon={icon} className={className} />;
}

function getColorByStatus(status?: Device['status']) {
  if (status === 'OK') return 'bg-green-500';
  if (status === 'WARNING') return 'bg-orange-500';
  if (status === 'CRITICAL') return 'bg-red-500';
  if (status === 'OFFLINE') return 'bg-gray-500';
  return 'bg-black';
}
