import { useEffect, useMemo, useState } from 'react';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import clsx from 'clsx';
import { Button } from '@src/components/Button';
import { Input } from '@src/components/Input';
import { Spinner } from '@src/components/Spinner';
import { ModuleArt, MODULE_HEADERS } from '@src/components/ModuleArt';
import { ModuleWiring } from '@src/components/ModuleWiring';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/Dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/Select';
import { DEVICE_TYPE_LABELS, getPinOptions } from '@src/lib/hardware';
import { ModuleEntry, buildModules, defaultDeviceName } from '@src/lib/modules';
import {
  DeviceTypeValue,
  SensorModel,
  useCreateDeviceMutation,
  useGetControllersQuery,
  useGetSensorModelsQuery,
} from '../generatedApi';
import { ControllerWithRole, DisplayModelValue, useGetDisplayModelsQuery } from '../controllersApi';
import { errorMessage } from '../helpers';
import { useModal } from './modals.hook';
import { DisplayModalId } from './DisplayModal';

export const ModuleCreationModalId = 'module-creation-modal-id';
// true opens the module gallery; controllerId pre-selects the board
export type ModuleCreationModal = Record<typeof ModuleCreationModalId, boolean | { controllerId?: number }>;

const SECTIONS: { kind: ModuleEntry['kind']; title: string }[] = [
  { kind: 'sensor', title: 'Sensors' },
  { kind: 'output', title: 'Outputs' },
  { kind: 'display', title: 'Displays' },
];

/**
 * "Add device": pick the module first, then wire it. A sensor becomes one device per measurement
 * (DHT11 -> temperature and humidity), a display becomes the board's display.
 */
export function ModuleCreationModal() {
  const { state, setState } = useModal(ModuleCreationModalId);
  const { setState: openDisplay } = useModal(DisplayModalId);
  const { data: sensors } = useGetSensorModelsQuery();
  const { data: displays } = useGetDisplayModelsQuery();
  const { data: controllers } = useGetControllersQuery();
  const modules = useMemo(() => buildModules(sensors, displays), [sensors, displays]);
  const boards = ((controllers ?? []) as ControllerWithRole[]).filter(c => !c.role || c.role === 'OWNER');

  const [module, setModule] = useState<ModuleEntry | null>(null);
  const [boardId, setBoardId] = useState<string>('');

  useEffect(() => {
    if (!state) return;
    setModule(null);
    const preset = typeof state === 'object' ? state.controllerId : undefined;
    setBoardId(String(preset ?? boards[0]?.id ?? ''));
  }, [state]);

  const close = () => setState(false);
  const board = boards.find(b => String(b.id) === boardId);

  const pick = (entry: ModuleEntry) => {
    if (entry.kind === 'display' && boards.length === 1) {
      close();
      openDisplay({ controllerId: boards[0].id!, model: entry.key as DisplayModelValue });
      return;
    }
    setModule(entry);
  };

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={open => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {module && (
              <button type="button" title="Back to modules" onClick={() => setModule(null)}>
                <Icon icon="lucide:arrow-left" className="size-4" />
              </button>
            )}
            {module ? `Add ${module.label}` : 'Add device'}
          </DialogTitle>
          <DialogDescription>
            {module ? module.does : 'Choose the module you wired to the board.'}
          </DialogDescription>
        </DialogHeader>

        {boards.length === 0 && (
          <p className="text-sm text-slate-500">
            Link a board first: enter the code it shows in “Connect a new board” on the Devices page.
          </p>
        )}

        {!module && boards.length > 0 && (
          <div className="flex flex-col gap-5">
            {SECTIONS.map(section => {
              const list = modules.filter(m => m.kind === section.kind);
              if (!list.length) return null;
              return (
                <section key={section.kind} className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-slate-700">{section.title}</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {list.map(entry => (
                      <ModuleCard key={entry.key} entry={entry} onClick={() => pick(entry)} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {module && board === undefined && boards.length > 0 && <p className="text-sm">Choose a board.</p>}

        {module && boards.length > 0 && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-24 text-slate-600">Board</span>
              <Select value={boardId} onValueChange={setBoardId}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="Choose a board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {boards.map(b => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name} ({b.platform ?? '?'})
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>

            {module.kind === 'display' ? (
              <DialogFooter>
                <Button
                  disabled={!board}
                  onClick={() => {
                    close();
                    openDisplay({ controllerId: board!.id!, model: module.key as DisplayModelValue });
                  }}
                >
                  Continue to wiring
                </Button>
              </DialogFooter>
            ) : (
              board && <SensorForm module={module} board={board} onDone={close} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModuleCard({ entry, onClick }: { entry: ModuleEntry; onClick: () => void }) {
  const header = MODULE_HEADERS[entry.key] ?? [];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-1.5 rounded-lg border border-black/10 bg-white p-2.5 text-left transition hover:border-blue-400 hover:shadow-sm"
    >
      <div className="flex justify-center rounded-md bg-gray-50 p-1.5">
        <ModuleArt module={entry.key} showLabels={false} className="h-14" />
      </div>
      <div className="text-sm font-semibold leading-tight">{entry.label}</div>
      <div className="text-xs leading-snug text-slate-500">{entry.does}</div>
      <div className="mt-auto flex flex-wrap gap-1 pt-1">
        {header.map(pin => (
          <span
            key={pin.label}
            className={clsx(
              'rounded px-1 font-mono text-[10px]',
              pin.signal ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-slate-500'
            )}
          >
            {pin.label}
          </span>
        ))}
      </div>
    </button>
  );
}

function SensorForm(props: { module: ModuleEntry; board: ControllerWithRole; onDone: () => void }) {
  const { module, board } = props;
  const info = module.sensor!;
  const types = (info.supportedTypes ?? []) as DeviceTypeValue[];
  // a plain analog input is one measurement, chosen; multi-sensors give all of theirs
  const single = module.key === 'ANALOG_INPUT' || types.length === 1;

  const [pins, setPins] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<DeviceTypeValue[]>(single ? [types[0]] : types);
  const [names, setNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(types.map(type => [type, defaultDeviceName(module, type)]))
  );
  const [intervalSeconds, setIntervalSeconds] = useState('10');
  const [busy, setBusy] = useState(false);
  const [createDevice] = useCreateDeviceMutation();

  const options = getPinOptions(board.platform, info, board.display);
  const signals = module.pins;
  const complete =
    signals.every(signal => pins[signal]) &&
    selected.length > 0 &&
    selected.every(type => names[type]?.trim()) &&
    Number(intervalSeconds) >= 1;

  const create = async () => {
    setBusy(true);
    for (const type of selected) {
      const res = await createDevice({
        deviceRequest: {
          name: names[type].trim(),
          type,
          controllerId: board.id,
          sensorModel: info.model as SensorModel,
          pin: Number(pins[signals[0]]),
          secondaryPin: signals[1] ? Number(pins[signals[1]]) : undefined,
          delay: Math.round(Number(intervalSeconds) * 1000),
          forecastModel: 'NONE',
        },
      });
      if ('error' in res) {
        notification.error({ message: `Could not add ${names[type]}`, description: errorMessage(res.error) });
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    notification.success({
      message: `${module.label} added`,
      description: board.online ? 'The board starts reading it in a few seconds.' : 'The board gets it when it comes online.',
    });
    props.onDone();
  };

  return (
    <>
      <ModuleWiring
        module={module.key}
        pins={pins}
        options={options}
        onChange={(signal, gpio) => setPins({ ...pins, [signal]: gpio })}
      />

      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-slate-500">
          {single ? 'Measurement' : 'Measurements, one device each'}
        </div>
        {single && types.length > 1 && (
          <Select value={selected[0]} onValueChange={value => setSelected([value as DeviceTypeValue])}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {types.map(type => (
                  <SelectItem key={type} value={type}>
                    {DEVICE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}
        {(single ? selected : types).map(type => (
          <div key={type} className="flex flex-wrap items-center gap-2 text-sm">
            {!single && (
              <input
                type="checkbox"
                className="size-4 accent-blue-600"
                checked={selected.includes(type)}
                onChange={e =>
                  setSelected(e.target.checked ? [...selected, type] : selected.filter(t => t !== type))
                }
              />
            )}
            <span className="w-28 text-slate-600">{DEVICE_TYPE_LABELS[type]}</span>
            <Input
              value={names[type] ?? ''}
              onChange={e => setNames({ ...names, [type]: e.target.value })}
              placeholder="Name"
              className="h-8 w-[240px]"
              disabled={!selected.includes(type)}
            />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">Send every</span>
        <Input value={intervalSeconds} onChange={e => setIntervalSeconds(e.target.value)} className="h-8 w-20" />
        <span className="text-slate-600">seconds</span>
      </label>
      <p className="-mt-2 text-xs text-slate-500">
        Thresholds for alerts and forecasts are set on each device afterwards (click it in the table).
      </p>

      <DialogFooter>
        <Button variant="secondary" onClick={props.onDone}>
          Cancel
        </Button>
        <Button disabled={busy || !complete} onClick={create}>
          {busy && <Spinner />}
          Add {selected.length > 1 ? `${selected.length} devices` : 'device'}
        </Button>
      </DialogFooter>
    </>
  );
}
