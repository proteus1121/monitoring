import { useEffect, useState } from 'react';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/Select';
import { getPinLabel, pinPlatform } from '@src/lib/hardware';
import { useModal } from '@src/redux/modals/modals.hook';
import { DeviceCreationModalId } from '@src/redux/modals/DeviceCreationModal';
import {
  Device,
  useCreateDeviceMutation,
  Controller,
  DisplayModel,
  ScanFinding,
  SuggestedDevice,
  useGetBoardScanQuery,
  useScanControllerMutation,
  useUpdateDisplayMutation,
} from '@src/redux/generatedApi';
import { errorMessage } from '@src/redux/helpers';
import { getLang, useTexts } from '@src/lib/lang';

const TEXTS = {
  uk: {
    scanFailed: 'Не вдалося почати сканування',
    title: 'Сканування плати',
    note: 'лише вільні піни: пристрої, дисплей і реле не зачіпаються',
    again: 'Сканувати ще раз',
    close: 'Закрити',
    checking: 'Плата перевіряє вільні піни, це займає кілька секунд…',
    timeout: 'Плата не відповіла. Вона має бути онлайн і мати прошивку 2.3.0 або новішу (оновіть її через Wi-Fi).',
    nothing: (pins: string) =>
      `На вільних пінах ${pins} нічого не знайдено. Модулі, які лише приймають сигнали (реле, SPI-дисплеї), виявити не можна, додайте їх вручну.`,
    scanned: (pins: string) =>
      `Проскановано ${pins}. Реле й SPI-дисплеї лише приймають сигнали, сканування їх не знаходить.`,
    addFailed: (name: string) => `Не вдалося додати ${name}`,
    addedMessage: (names: string) => `Додано: ${names}`,
    displayFailed: 'Не вдалося задати дисплей',
    displaySet: 'Дисплей задано',
    displayRestart: 'Плата перезапуститься, щоб його використати.',
    added: 'додано',
    add: 'Додати',
    devices: (count: number) => `${count} пристрої`,
    openForm: 'Відкрити заповнену форму пристрою',
    useAsDisplay: 'Використати як дисплей',
  },
  en: {
    scanFailed: 'Could not start the scan',
    title: 'Board scan',
    note: 'free pins only: devices, display and relays are not touched',
    again: 'Scan again',
    close: 'Close',
    checking: 'The board is checking its free pins, it takes a few seconds…',
    timeout: 'The board did not answer. It has to be online and run firmware 2.3.0 or newer (update it over Wi-Fi).',
    nothing: (pins: string) =>
      `Nothing found on the free pins ${pins}. Modules that only receive signals (relays, SPI displays) cannot be detected, add them by hand.`,
    scanned: (pins: string) =>
      `Scanned ${pins}. Relays and SPI displays only receive signals and are not found by a scan.`,
    addFailed: (name: string) => `Could not add ${name}`,
    addedMessage: (names: string) => `Added ${names}`,
    displayFailed: 'Could not set the display',
    displaySet: 'Display set',
    displayRestart: 'The board restarts to use it.',
    added: 'added',
    add: 'Add',
    devices: (count: number) => `${count} devices`,
    openForm: 'Open the device form pre-filled',
    useAsDisplay: 'Use as display',
  },
};

const DEFAULT_DELAY_MS = 10000;

const KIND_ICONS: Record<ScanFinding['kind'], string> = {
  SENSOR: 'lucide:circle-check',
  DISPLAY: 'lucide:monitor',
  CHOOSE: 'lucide:circle-help',
  UNSUPPORTED: 'lucide:circle-slash',
};

function formatReadings(readings: Record<string, number>) {
  return Object.entries(readings)
    .map(([key, value]) => {
      if (key === 'TEMPERATURE') return `${value.toFixed(1)} °C`;
      if (key === 'HUMIDITY') return `${value.toFixed(0)} %`;
      if (key === 'PRESSURE') return `${value.toFixed(1)} ${getLang() === 'uk' ? 'гПа' : 'hPa'}`;
      if (key === 'LEVEL') return value >= 0.5 ? 'HIGH' : 'LOW';
      if (key === 'ANALOG') return `ADC ${value.toFixed(0)}`;
      return `${key} ${value}`;
    })
    .join(' · ');
}

function toDevice(suggested: SuggestedDevice, controllerId: number): Device {
  return {
    name: suggested.name,
    type: suggested.type,
    controllerId,
    sensorModel: suggested.sensorModel,
    pin: suggested.pin,
    secondaryPin: suggested.secondaryPin ?? undefined,
    delay: DEFAULT_DELAY_MS,
  };
}

/**
 * "Scan board": the board looks for modules on its free pins, found ones are offered as devices.
 */
export function ScanPanel(props: { controller: Controller; onClose: () => void }) {
  const { controller } = props;
  const t = useTexts(TEXTS);
  const id = controller.id!;
  const [pending, setPending] = useState(true);
  const { data: scan } = useGetBoardScanQuery({ id }, { pollingInterval: pending ? 1500 : 0 });
  const [rescan, { isLoading: isStarting }] = useScanControllerMutation();
  const [added, setAdded] = useState<Set<number>>(new Set());

  useEffect(() => {
    setPending(scan?.status === 'PENDING');
  }, [scan?.status]);

  const pinText = (pins: number[]) => pins.map(pin => getPinLabel(pinPlatform(controller), pin)).join(' / ');

  const again = async () => {
    setAdded(new Set());
    const res = await rescan({ id });
    if ('error' in res) {
      notification.error({ message: t.scanFailed, description: errorMessage(res.error) });
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm">
      <div className="mb-2 flex items-center gap-2">
        <Icon icon="lucide:scan-search" className="size-4 text-slate-600" />
        <span className="font-medium">{t.title}</span>
        <span className="text-xs text-slate-500">{t.note}</span>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" disabled={isStarting || pending} onClick={again}>
            <Icon icon="lucide:refresh-cw" />
            {t.again}
          </Button>
          <Button size="icon" variant="ghost" title={t.close} onClick={props.onClose}>
            <Icon icon="lucide:x" />
          </Button>
        </div>
      </div>

      {(!scan || scan.status === 'PENDING') && (
        <div className="flex items-center gap-2 text-slate-600">
          <Spinner />
          {t.checking}
        </div>
      )}

      {scan?.status === 'TIMEOUT' && (
        <p className="text-orange-800">{t.timeout}</p>
      )}

      {scan?.status === 'DONE' && (
        <div className="flex flex-col gap-2">
          {scan.findings.length === 0 && (
            <p className="text-slate-600">{t.nothing(pinText(scan.scannedPins))}</p>
          )}
          {scan.findings.map((finding, index) => (
            <FindingRow
              key={index}
              finding={finding}
              controller={controller}
              pinText={pinText(finding.pins)}
              added={added.has(index)}
              onAdded={() => setAdded(new Set(added).add(index))}
            />
          ))}
          {scan.findings.length > 0 && (
            <p className="text-xs text-slate-500">{t.scanned(pinText(scan.scannedPins))}</p>
          )}
        </div>
      )}
    </div>
  );
}

function FindingRow(props: {
  finding: ScanFinding;
  controller: Controller;
  pinText: string;
  added: boolean;
  onAdded: () => void;
}) {
  const { finding, controller } = props;
  const t = useTexts(TEXTS);
  const [choice, setChoice] = useState(0);
  const [displayModel, setDisplayModel] = useState<DisplayModel>(finding.display?.model ?? 'SSD1306');
  const [busy, setBusy] = useState(false);
  const [createDevice] = useCreateDeviceMutation();
  const [updateDisplay] = useUpdateDisplayMutation();
  const { setState: openCreation } = useModal(DeviceCreationModalId);

  const option = finding.options[choice];

  const addDevices = async () => {
    if (!option) return;
    setBusy(true);
    for (const suggested of option.devices) {
      const device = toDevice(suggested, controller.id!);
      const res = await createDevice({
        deviceRequest: { ...device, delay: DEFAULT_DELAY_MS, name: device.name!, forecastModels: [] },
      });
      if ('error' in res) {
        notification.error({ message: t.addFailed(suggested.name ?? ''), description: errorMessage(res.error) });
        setBusy(false);
        return;
      }
    }
    setBusy(false);
    notification.success({ message: t.addedMessage(option.devices.map(d => d.name).join(', ')) });
    props.onAdded();
  };

  const useAsDisplay = async () => {
    if (!finding.display) return;
    setBusy(true);
    const res = await updateDisplay({
      id: controller.id!,
      displayRequest: { model: displayModel, pins: finding.display.pins, flip: false },
    });
    setBusy(false);
    if ('error' in res) {
      notification.error({ message: t.displayFailed, description: errorMessage(res.error) });
      return;
    }
    notification.success({ message: t.displaySet, description: t.displayRestart });
    props.onAdded();
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md bg-white p-2.5 shadow-xs">
      <Icon
        icon={KIND_ICONS[finding.kind]}
        className={`size-4 ${finding.kind === 'SENSOR' ? 'text-green-600' : finding.kind === 'UNSUPPORTED' ? 'text-slate-400' : 'text-blue-600'}`}
      />
      <div className="min-w-[180px] flex-1">
        <div className="font-medium">
          {finding.title} <span className="font-mono text-xs font-normal text-slate-500">{props.pinText}</span>
        </div>
        {Object.keys(finding.readings).length > 0 && (
          <div className="text-xs text-slate-600">{formatReadings(finding.readings)}</div>
        )}
        {finding.note && <div className="text-xs text-slate-500">{finding.note}</div>}
      </div>

      {props.added ? (
        <span className="flex items-center gap-1 text-xs text-green-700">
          <Icon icon="lucide:check" /> {t.added}
        </span>
      ) : (
        <>
          {finding.kind === 'CHOOSE' && (
            <Select value={String(choice)} onValueChange={v => setChoice(Number(v))}>
              <SelectTrigger className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {finding.options.map((o, i) => (
                    <SelectItem key={o.model} value={String(i)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          {(finding.kind === 'SENSOR' || finding.kind === 'CHOOSE') && option && (
            <>
              <Button size="sm" disabled={busy} onClick={addDevices}>
                {busy ? <Spinner /> : <Icon icon="lucide:plus" />}
                {t.add} {option.devices.length > 1 ? t.devices(option.devices.length) : ''}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title={t.openForm}
                onClick={() => openCreation(toDevice(option.devices[0], controller.id!))}
              >
                <Icon icon="lucide:pencil" />
              </Button>
            </>
          )}
          {finding.kind === 'DISPLAY' && (
            <>
              <Select value={displayModel} onValueChange={v => setDisplayModel(v as DisplayModel)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="SSD1306">SSD1306</SelectItem>
                    <SelectItem value="SH1106">SH1106</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button size="sm" disabled={busy} onClick={useAsDisplay}>
                {busy ? <Spinner /> : <Icon icon="lucide:monitor" />}
                {t.useAsDisplay}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
