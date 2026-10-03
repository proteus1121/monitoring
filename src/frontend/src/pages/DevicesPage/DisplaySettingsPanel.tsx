import { useMemo, useState } from 'react';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import { Switch } from '@src/components/Switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/Select';
import { DISPLAY_PIN_NAMES, getDisplayPinOptions, getPinLabel } from '@src/lib/hardware';
import type { Device, SensorModelInfo } from '@src/redux/generatedApi';
import {
  ControllerWithRole,
  DisplayModelValue,
  useGetDisplayModelsQuery,
  useUpdateDisplayMutation,
} from '@src/redux/controllersApi';
import { errorMessage } from '@src/redux/helpers';

/**
 * Display of a board: what is configured, whether the board found it, and a form to change it.
 */
export function DisplaySettingsPanel(props: {
  controller: ControllerWithRole;
  devices: Device[];
  models: SensorModelInfo[] | undefined;
}) {
  const { controller } = props;
  const display = controller.display;
  const canEdit = !controller.role || controller.role === 'OWNER';
  const [editing, setEditing] = useState(false);

  const summary =
    !display || display.model === 'NONE'
      ? 'No display'
      : `${display.model} · ` +
        display.pins
          .map((gpio, i) => `${DISPLAY_PIN_NAMES[display.model][i]} ${getPinLabel(controller.platform, gpio)}`)
          .join(' · ') +
        (display.flip ? ' · rotated' : '');

  return (
    <div className="rounded-lg bg-gray-50 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Icon icon="lucide:monitor" className="size-4 text-slate-500" />
        <span className="font-medium">Display</span>
        <span className="font-mono text-xs text-slate-600">{summary}</span>
        {controller.displayFound === false && display?.model !== 'NONE' && (
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800">
            not found by the board: check the wiring and the model
          </span>
        )}
        {canEdit && !editing && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(true)}>
            <Icon icon="lucide:settings-2" />
            Change
          </Button>
        )}
      </div>
      {editing && (
        <DisplayForm {...props} onDone={() => setEditing(false)} />
      )}
    </div>
  );
}

function DisplayForm(props: {
  controller: ControllerWithRole;
  devices: Device[];
  models: SensorModelInfo[] | undefined;
  onDone: () => void;
}) {
  const { controller } = props;
  const { data: displayModels } = useGetDisplayModelsQuery();
  const [update, { isLoading }] = useUpdateDisplayMutation();
  const [model, setModel] = useState<DisplayModelValue>(controller.display?.model ?? 'NONE');
  const [pins, setPins] = useState<string[]>((controller.display?.pins ?? []).map(String));
  const [flip, setFlip] = useState(controller.display?.flip ?? false);

  const info = displayModels?.find(m => m.model === model);
  const pinNames = DISPLAY_PIN_NAMES[model];
  const i2c = info?.bus === 'I2C';

  // pins of the devices on this board, a BMP180 may share an I2C display bus
  const usedBy = useMemo(() => {
    const map = new Map<number, { name: string; i2cShareable: boolean }>();
    for (const device of props.devices) {
      const label = props.models?.find(m => m.model === device.sensorModel)?.label ?? device.sensorModel ?? '';
      for (const gpio of [device.pin, device.secondaryPin]) {
        if (gpio !== undefined && gpio !== null) {
          map.set(gpio, { name: label, i2cShareable: device.sensorModel === 'BMP180' });
        }
      }
    }
    return map;
  }, [props.devices, props.models]);
  const options = getDisplayPinOptions(controller.platform, usedBy, i2c);

  const changeModel = (next: DisplayModelValue) => {
    setModel(next);
    // keep the pins when switching between the two I2C models
    const sameBus = DISPLAY_PIN_NAMES[next].length === pinNames.length;
    setPins(sameBus ? pins : DISPLAY_PIN_NAMES[next].map(() => ''));
  };

  const complete = pins.length === pinNames.length && pins.every(Boolean) && new Set(pins).size === pins.length;

  const save = async () => {
    const res = await update({ id: controller.id!, model, pins: pins.map(Number), flip });
    if ('error' in res) {
      notification.error({ message: 'Could not save the display', description: errorMessage(res.error) });
      return;
    }
    notification.success({
      message: 'Display saved',
      description: controller.online
        ? 'The board restarts to use it, it is back online in a few seconds.'
        : 'The board gets it when it comes online.',
    });
    props.onDone();
  };

  return (
    <form
      className="mt-3 flex flex-col gap-3"
      onSubmit={e => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-600">
          Module
          <Select value={model} onValueChange={v => changeModel(v as DisplayModelValue)}>
            <SelectTrigger className="w-[220px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {(displayModels ?? []).map(m => (
                  <SelectItem key={m.model} value={m.model}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </label>
        {pinNames.map((name, i) => (
          <label key={name} className="flex flex-col gap-1 text-xs text-slate-600">
            {name}
            <Select
              value={pins[i] ?? ''}
              onValueChange={v => setPins(pins.map((p, j) => (j === i ? v : p)))}
            >
              <SelectTrigger className="w-[150px] bg-white">
                <SelectValue placeholder="Pin" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {options.map(o => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      // a pin already chosen for another line of the display
                      disabled={o.disabled || (pins.includes(o.value) && pins[i] !== o.value)}
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
        ))}
        {model !== 'NONE' && (
          <label className="flex items-center gap-2 pb-2 text-xs text-slate-600">
            <Switch checked={flip} onCheckedChange={setFlip} />
            Rotate 180°
          </label>
        )}
      </div>
      {info?.description && <p className="text-xs text-slate-500">{info.description}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isLoading || (model !== 'NONE' && !complete)}>
          {isLoading && <Spinner />}
          Save
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={props.onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
