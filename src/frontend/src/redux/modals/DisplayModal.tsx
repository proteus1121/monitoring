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
import { DISPLAY_PIN_NAMES, getDisplayPinOptions, pinPlatform } from '@src/lib/hardware';
import { pick } from '@src/lib/lang';
import { modelDescription } from '@src/lib/modules';
import clsx from 'clsx';

const TEXTS = {
  uk: {
    saveFailed: 'Не вдалося зберегти дисплей',
    removed: 'Дисплей прибрано',
    saved: 'Дисплей збережено',
    restarts: 'Плата перезапуститься, щоб застосувати його, і за кілька секунд знову буде онлайн.',
    whenOnline: 'Плата отримає його, коли з’явиться онлайн.',
    title: (board: string) => (board ? `Дисплей плати ${board}` : 'Дисплей плати'),
    theBoard: '',
    noScreen: 'Плата працює без екрана.',
    rotate: 'Повернути на 180°',
    language: 'Мова екрана',
    languageSet: 'Мову екрана змінено',
    languageFailed: 'Не вдалося змінити мову екрана',
    languageNote: 'Застосовується без перезапуску плати, з прошивкою 2.7.0 і новішою.',
    notFound: 'Плата не знайшла поточний дисплей: перевірте під’єднання й модель.',
    remove: 'Прибрати дисплей',
    cancel: 'Скасувати',
    save: 'Зберегти',
  },
  en: {
    saveFailed: 'Could not save the display',
    removed: 'Display removed',
    saved: 'Display saved',
    restarts: 'The board restarts to apply it, it is back online in a few seconds.',
    whenOnline: 'The board gets it when it comes online.',
    title: (board: string) => `Display of ${board}`,
    theBoard: 'the board',
    noScreen: 'The board runs without a screen.',
    rotate: 'Rotate 180°',
    language: 'Screen language',
    languageSet: 'Screen language changed',
    languageFailed: 'Could not change the screen language',
    languageNote: 'Applied without a restart, with firmware 2.7.0 or newer.',
    notFound: 'The board did not find the current display: check the wiring and the model.',
    remove: 'Remove display',
    cancel: 'Cancel',
    save: 'Save',
  },
};
import {
  useGetAllDevicesQuery,
  useGetControllersQuery,
  useGetSensorModelsQuery,
  DisplayLanguage,
  DisplayModel,
  useGetDisplayModelsQuery,
  useUpdateDisplayLanguageMutation,
  useUpdateDisplayMutation,
} from '../generatedApi';
import { errorMessage } from '../helpers';
import { useModal } from './modals.hook';
import { ModalState } from './modals.types';

export const DisplayModalId = 'display-modal-id';
// `model` pre-selects a display, e.g. one chosen in "Add device"
export type DisplayModal = ModalState<typeof DisplayModalId, { controllerId: number; model?: DisplayModel }>;

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
  const [updateLanguage, { isLoading: isLanguageSaving }] = useUpdateDisplayLanguageMutation();

  const controller = controllers?.find(c => c.id === state?.controllerId);
  const [model, setModel] = useState<DisplayModel>('NONE');
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
  const options = getDisplayPinOptions(pinPlatform(controller), usedBy, info?.bus === 'I2C');

  const complete = names.every(name => pins[name]);

  const changeLanguage = async (language: DisplayLanguage) => {
    if (!controller || language === controller.displayLanguage) return;
    const res = await updateLanguage({ id: controller.id!, displayLanguageRequest: { language } });
    if ('error' in res) {
      notification.error({ message: pick(TEXTS).languageFailed, description: errorMessage(res.error) });
    } else {
      notification.success({ message: pick(TEXTS).languageSet });
    }
  };

  const save = async (nextModel: DisplayModel) => {
    if (!controller) return;
    const res = await update({
      id: controller.id!,
      displayRequest: {
        model: nextModel,
        pins: nextModel === 'NONE' ? [] : DISPLAY_PIN_NAMES[nextModel].map(name => Number(pins[name])),
        flip,
      },
    });
    if ('error' in res) {
      notification.error({ message: pick(TEXTS).saveFailed, description: errorMessage(res.error) });
      return;
    }
    notification.success({
      message: nextModel === 'NONE' ? pick(TEXTS).removed : pick(TEXTS).saved,
      description: controller.online ? pick(TEXTS).restarts : pick(TEXTS).whenOnline,
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
          <DialogTitle>{pick(TEXTS).title(controller?.name ?? pick(TEXTS).theBoard)}</DialogTitle>
          <DialogDescription>{info ? modelDescription(info) : pick(TEXTS).noScreen}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={model}
              onValueChange={value => {
                setModel(value as DisplayModel);
                // the two I2C displays share pin names, keep their wiring
                if (DISPLAY_PIN_NAMES[value as DisplayModel].join() !== names.join()) setPins({});
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
                {pick(TEXTS).rotate}
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
          {model !== 'NONE' && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              {pick(TEXTS).language}
              <div className="flex rounded-md border border-black/10 text-xs">
                {(['UK', 'EN'] as DisplayLanguage[]).map(language => (
                  <button
                    key={language}
                    type="button"
                    disabled={isLanguageSaving}
                    onClick={() => changeLanguage(language)}
                    className={clsx(
                      'px-2.5 py-1 first:rounded-l-md last:rounded-r-md disabled:opacity-60',
                      (controller?.displayLanguage ?? 'UK') === language
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {language === 'UK' ? 'UA' : 'EN'}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">{pick(TEXTS).languageNote}</span>
            </div>
          )}
          {controller?.displayFound === false && controller.display?.model !== 'NONE' && (
            <p className="rounded-md bg-orange-50 p-2 text-sm text-orange-800">
              {pick(TEXTS).notFound}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {controller?.display?.model && controller.display.model !== 'NONE' ? (
            <Button variant="secondary" disabled={isLoading} onClick={() => save('NONE')}>
              {pick(TEXTS).remove}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setState(null)}>
              {pick(TEXTS).cancel}
            </Button>
            <Button disabled={isLoading || (model !== 'NONE' && !complete)} onClick={() => save(model)}>
              {isLoading && <Spinner />}
              {pick(TEXTS).save}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
