import { useEffect, useMemo, useState } from 'react';
import { notification } from 'antd';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import { Switch } from '@src/components/Switch';
import { ModuleWiring } from '@src/components/ModuleWiring';
import { ModuleKey } from '@src/components/ModuleArt';
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
import { DISPLAY_PIN_NAMES, getDisplayPinOptions } from '@src/lib/hardware';
import { useGetAllDevicesQuery, useGetControllersQuery, useGetSensorModelsQuery } from '../generatedApi';
import {
  ControllerWithRole,
  DisplayModelValue,
  useGetDisplayModelsQuery,
  useUpdateDisplayMutation,
} from '../controllersApi';
import { errorMessage } from '../helpers';
import { useModal } from './modals.hook';
import { ModalState } from './modals.types';

export const DisplayModalId = 'display-modal-id';
// `model` pre-selects a display, e.g. one chosen in "Add device"
export type DisplayModal = ModalState<typeof DisplayModalId, { controllerId: number; model?: DisplayModelValue }>;

/**
 * Display of a board: model, wiring and rotation. Saving sends it to the board, which restarts to drive it.
 */
export function DisplayModal() {
  const { state, setState } = useModal(DisplayModalId);
  const { data: controllers } = useGetControllersQuery();
  const { data: devices } = useGetAllDevicesQuery();
  const { data: sensorModels } = useGetSensorModelsQuery();
  const { data: displayModels } = useGetDisplayModelsQuery();
  const [update, { isLoading }] = useUpdateDisplayMutation();

  const controller = (controllers as ControllerWithRole[] | undefined)?.find(c => c.id === state?.controllerId);
  const [model, setModel] = useState<DisplayModelValue>('NONE');
  const [pins, setPins] = useState<Record<string, string>>({});
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (!state || !controller) return;
    const current = controller.display;
    const next = state.model ?? current?.model ?? 'NONE';
    setModel(next);
    // keep the current wiring when it is the same display
    const names = DISPLAY_PIN_NAMES[next];
    setPins(
      current?.model === next
        ? Object.fromEntries(names.map((name, i) => [name, String(current.pins[i] ?? '')]))
        : {}
    );
    setFlip(current?.model === next ? current.flip : false);
  }, [state, controller?.id]);

  const info = displayModels?.find(m => m.model === model);
  const names = DISPLAY_PIN_NAMES[model];

  // pins of the devices on this board; a BMP180 may share an I2C display bus
  const usedBy = useMemo(() => {
    const map = new Map<number, { name: string; i2cShareable: boolean }>();
    for (const device of (devices ?? []).filter(d => d.controllerId === controller?.id)) {
      const label = sensorModels?.find(m => m.model === device.sensorModel)?.label ?? device.sensorModel ?? '';
      for (const gpio of [device.pin, device.secondaryPin]) {
        if (gpio !== undefined && gpio !== null) {
          map.set(gpio, { name: label, i2cShareable: device.sensorModel === 'BMP180' });
        }
      }
    }
    return map;
  }, [devices, sensorModels, controller?.id]);
  const options = getDisplayPinOptions(controller?.platform, usedBy, info?.bus === 'I2C');

  const complete = names.every(name => pins[name]);

  const save = async (nextModel: DisplayModelValue) => {
    if (!controller) return;
    const res = await update({
      id: controller.id!,
      model: nextModel,
      pins: nextModel === 'NONE' ? [] : DISPLAY_PIN_NAMES[nextModel].map(name => Number(pins[name])),
      flip,
    });
    if ('error' in res) {
      notification.error({ message: 'Could not save the display', description: errorMessage(res.error) });
      return;
    }
    notification.success({
      message: nextModel === 'NONE' ? 'Display removed' : 'Display saved',
      description: controller.online
        ? 'The board restarts to apply it, it is back online in a few seconds.'
        : 'The board gets it when it comes online.',
    });
    setState(null);
  };

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={open => {
        if (!open) setState(null);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Display of {controller?.name ?? 'the board'}</DialogTitle>
          <DialogDescription>{info?.description ?? 'The board runs without a screen.'}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={model}
              onValueChange={value => {
                setModel(value as DisplayModelValue);
                // the two I2C displays share pin names, keep their wiring
                if (DISPLAY_PIN_NAMES[value as DisplayModelValue].join() !== names.join()) setPins({});
              }}
            >
              <SelectTrigger className="w-[240px]">
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
            {model !== 'NONE' && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <Switch checked={flip} onCheckedChange={setFlip} />
                Rotate 180°
              </label>
            )}
          </div>

          {model !== 'NONE' && (
            <ModuleWiring
              module={model as ModuleKey}
              pins={pins}
              options={options}
              onChange={(signal, gpio) => setPins({ ...pins, [signal]: gpio })}
            />
          )}
          {controller?.displayFound === false && controller.display?.model !== 'NONE' && (
            <p className="rounded-md bg-orange-50 p-2 text-sm text-orange-800">
              The board did not find the current display: check the wiring and the model.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {controller?.display?.model && controller.display.model !== 'NONE' ? (
            <Button variant="secondary" disabled={isLoading} onClick={() => save('NONE')}>
              Remove display
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setState(null)}>
              Cancel
            </Button>
            <Button disabled={isLoading || (model !== 'NONE' && !complete)} onClick={() => save(model)}>
              {isLoading && <Spinner />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
