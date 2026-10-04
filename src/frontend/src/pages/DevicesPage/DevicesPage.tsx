import { useEffect, useMemo, useState } from 'react';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import clsx from 'clsx';
import { ModuleCreationModalId } from '@src/redux/modals/ModuleCreationModal';
import { DisplayModalId } from '@src/redux/modals/DisplayModal';
import { DeviceUpdatingModalId } from '@src/redux/modals/DeviceUpdatingModal';
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
import { DEVICE_TYPE_LABELS, DISPLAY_PIN_NAMES, getPinLabel } from '@src/lib/hardware';
import { ControllerWithRole, useUpdateDisplayMutation } from '@src/redux/controllersApi';
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
  useSendCommandMutation,
} from '@src/redux/generatedApi';
import { ControllerPanel, SetupHint } from './ControllersSection';

const POLLING_INTERVAL_MS = 30000;
const PENDING_POLLING_INTERVAL_MS = 3000;

const FORECAST_LABELS: Record<string, string> = {
  ARIMA: 'ARIMA',
  KALMAN: 'Kalman',
  XGBOOST: 'XGBoost',
};

const DevicesPage = () => {
  const { data: devices, isLoading, error } = useGetAllDevicesQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  // an online board confirms a new configuration within seconds, poll faster until it does
  const [waitingForBoard, setWaitingForBoard] = useState(false);
  const { data: controllers } = useGetControllersQuery(undefined, {
    pollingInterval: waitingForBoard ? PENDING_POLLING_INTERVAL_MS : POLLING_INTERVAL_MS,
  });
  useEffect(() => {
    setWaitingForBoard(Boolean(controllers?.some(c => c.online && !c.synced)));
  }, [controllers]);
  const { data: models } = useGetSensorModelsQuery();
  const { data: readings } = useGetLatestReadingsQuery(undefined, {
    pollingInterval: POLLING_INTERVAL_MS,
  });
  const { setState: openCreation } = useModal(ModuleCreationModalId);

  useEffect(() => {
    if (error) {
      notification.error({ message: `Failed to load devices: ${JSON.stringify(error)}` });
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
          <PageHeaderTitle>Devices</PageHeaderTitle>
          <PageHeaderDescription>
            Boards, how sensors are wired to them, and the configuration of every device
          </PageHeaderDescription>
        </div>
        <Button onClick={() => openCreation(true)} className="ml-2 shrink-0">
          <Icon icon="lucide:plus" className="size-4" />
          Add Device
        </Button>
      </PageHeader>

      <SetupHint />

      <section className="space-y-4">
        <h2 className="font-semibold">Boards</h2>
        {controllers?.length ? (
          controllers.map(controller => (
            <ControllerPanel
              key={controller.id}
              controller={controller}
              devices={(devices ?? []).filter(
                d => d.controllerId === controller.id && d.sensorModel
              )}
              models={models}
            />
          ))
        ) : (
          <Card className="text-sm text-slate-500">
            No boards yet. Enter the code the board shows in “Connect a new board” above.
          </Card>
        )}
      </section>

      {unwired.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Not wired to a board</h2>
            <p className="text-sm text-slate-500">
              These devices do not receive configuration; edit one and choose a board, module and pin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unwired.map(device => (
              <UnwiredChip key={device.id} device={device} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">All devices</h2>
        <DevicesTable
          devices={devices ?? []}
          controllers={controllers}
          models={models}
          readings={readingByDevice}
        />
      </section>
    </PageLayout>
  );
};

export default DevicesPage;

function UnwiredChip({ device }: { device: Device }) {
  const { setState: edit } = useModal(DeviceUpdatingModalId);
  return (
    <button
      type="button"
      onClick={() => edit(device)}
      className="flex items-center gap-2 rounded-full border border-dashed border-black/20 bg-white px-3 py-1.5 text-sm hover:border-blue-400"
    >
      <DeviceIcon type={device.type} className="size-4 text-slate-500" />
      {device.name}
      <Icon icon="lucide:plug-zap" className="size-4 text-slate-400" />
    </button>
  );
}

function DevicesTable(props: {
  devices: Device[];
  controllers?: Controller[];
  models?: SensorModelInfo[];
  readings: Map<number, LatestReading>;
}) {
  const [deleteDevice] = useDeleteDeviceMutation();
  const { setState: confirm } = useModal(AppAlertDialogModalId);
  const { setState: edit } = useModal(DeviceUpdatingModalId);
  const { setState: openDisplay } = useModal(DisplayModalId);
  const [updateDisplay] = useUpdateDisplayMutation();
  // a board's display is listed like a device
  const displays = ((props.controllers ?? []) as ControllerWithRole[]).filter(
    c => c.display && c.display.model !== 'NONE'
  );

  if (props.devices.length === 0 && displays.length === 0) {
    return <Card className="text-sm text-slate-500">No devices yet.</Card>;
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-black/10 text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Device</th>
            <th className="px-4 py-2 font-medium">Board · module · pin</th>
            <th className="px-4 py-2 font-medium">Last value</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Forecast</th>
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
                title="Edit"
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
                      {controller?.name ?? `Board #${device.controllerId}`} ·{' '}
                      {model?.label ?? device.sensorModel} ·{' '}
                      {getPinLabel(controller?.platform, device.pin)}
                      {device.secondaryPin !== undefined && device.secondaryPin !== null &&
                        ` / ${getPinLabel(controller?.platform, device.secondaryPin)}`}
                    </>
                  ) : (
                    <span className="text-slate-400">not wired</span>
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
                    {device.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {device.forecastModel && device.forecastModel !== 'NONE' ? (
                    <>
                      {FORECAST_LABELS[device.forecastModel]}
                      {device.forecastMae !== undefined && device.forecastMae !== null && (
                        <div className="text-xs text-slate-400">MAE {device.forecastMae.toFixed(2)}</div>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    {model?.output && device.controllerId && <RelayControls deviceId={device.id!} />}
                    <Button size="icon" variant="ghost" title="Configure" onClick={() => edit(device)}>
                      <Icon icon="lucide:settings-2" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete"
                      onClick={() =>
                        confirm({
                          description: `Delete ${device.name} with its history?`,
                          callback: async () => {
                            const res = await deleteDevice({ id: device.id! });
                            if ('error' in res) {
                              notification.error({
                                message: `Failed to delete ${device.name}`,
                                description: errorMessage(res.error),
                              });
                            } else {
                              notification.success({ message: `Deleted ${device.name}` });
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
          {displays.map(board => {
            const display = board.display!;
            const pins = display.pins
              .map((gpio, i) => `${DISPLAY_PIN_NAMES[display.model][i]} ${getPinLabel(board.platform, gpio)}`)
              .join(' / ');
            return (
              <tr
                key={`display-${board.id}`}
                className="cursor-pointer border-b border-black/5 last:border-b-0 hover:bg-gray-50"
                title="Edit"
                onClick={() => openDisplay({ controllerId: board.id! })}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <ModuleArt module={display.model} showLabels={false} className="h-6 w-8 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium">Display</div>
                      <div className="text-xs text-slate-500">{display.model}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-slate-600">
                  {board.name} · {display.model} · {pins}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-400">shows the readings</td>
                <td className="px-4 py-2.5">
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs text-white',
                      board.displayFound === false ? 'bg-orange-500' : board.displayFound ? 'bg-green-500' : 'bg-gray-400'
                    )}
                    title={board.displayFound === false ? 'The board did not find it: check the wiring and the model' : undefined}
                  >
                    {board.displayFound === false ? 'NOT FOUND' : board.displayFound ? 'OK' : 'UNKNOWN'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-400">—</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Configure"
                      onClick={() => openDisplay({ controllerId: board.id! })}
                    >
                      <Icon icon="lucide:settings-2" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Remove"
                      onClick={() =>
                        confirm({
                          description: `Remove the display of ${board.name}? The board restarts without a screen.`,
                          callback: async () => {
                            const res = await updateDisplay({ id: board.id!, model: 'NONE', pins: [], flip: false });
                            if ('error' in res) {
                              notification.error({
                                message: 'Failed to remove the display',
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
    </Card>
  );
}

function RelayControls({ deviceId }: { deviceId: number }) {
  const [sendCommand, { isLoading }] = useSendCommandMutation();

  const send = async (value: number) => {
    const res = await sendCommand({ id: deviceId, deviceCommandRequest: { value } });
    if (res.error) {
      notification.error({ message: 'Failed to send command', description: JSON.stringify(res.error) });
    }
  };

  return (
    <div className="mr-1 flex gap-1">
      <Button size="sm" disabled={isLoading} onClick={() => send(1)}>
        On
      </Button>
      <Button size="sm" variant="secondary" disabled={isLoading} onClick={() => send(0)}>
        Off
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
