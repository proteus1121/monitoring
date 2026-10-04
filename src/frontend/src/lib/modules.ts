import type { ModuleKey } from '@src/components/ModuleArt';
import type { DisplayModelInfo, DisplayModelValue } from '@src/redux/controllersApi';
import type { DeviceTypeValue, SensorModelInfo } from '@src/redux/generatedApi';
import { DEVICE_TYPE_LABELS } from './hardware';
import { pick } from './lang';

const TEXTS = {
  uk: {
    and: 'і',
    switches: 'Вмикає й вимикає навантаження із сайту',
    readsVoltage: 'Читає напругу: будь-який аналоговий датчик',
    measures: (what: string) => `Вимірює: ${what}`,
    display: 'Показує на платі показники та дані для налаштування',
  },
  en: {
    and: 'and',
    switches: 'Switches a load on and off from the site',
    readsVoltage: 'Reads a voltage: any analog sensor',
    measures: (what: string) => `Measures ${what}`,
    display: 'Shows the readings and the setup info on the board',
  },
};

/**
 * A module the user can wire to a board: a sensor / output (becomes devices) or a display (a board setting).
 * Built from the server's lists so it always matches the firmware.
 */
export type ModuleEntry = {
  key: ModuleKey;
  kind: 'sensor' | 'output' | 'display';
  label: string;
  description: string;
  // what it does, e.g. "Measures temperature and humidity"
  does: string;
  // pins the site asks a GPIO for, in the order the server expects
  pins: string[];
  sensor?: SensorModelInfo;
  display?: DisplayModelInfo;
};

// "Temperature" -> "temperature", acronyms stay: "LPG", "methane (CH4)"
const inSentence = (label: string) => label.replace(/^\p{Lu}(?=\p{Ll})/u, c => c.toLowerCase());

function joinTypes(types: DeviceTypeValue[]) {
  const names = types.map(type => inSentence(DEVICE_TYPE_LABELS[type]));
  const and = pick(TEXTS).and;
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}` : names[0] ?? '';
}

export function buildModules(sensors?: SensorModelInfo[], displays?: DisplayModelInfo[]): ModuleEntry[] {
  const sensorModules: ModuleEntry[] = (sensors ?? []).map(sensor => ({
    key: sensor.model as ModuleKey,
    kind: sensor.output ? 'output' : 'sensor',
    label: sensor.label ?? sensor.model!,
    description: sensor.description ?? '',
    does: sensor.output
      ? pick(TEXTS).switches
      : sensor.model === 'ANALOG_INPUT'
        ? pick(TEXTS).readsVoltage
        : pick(TEXTS).measures(joinTypes(sensor.supportedTypes ?? [])),
    pins: sensor.pins ?? [],
    sensor,
  }));
  const displayModules: ModuleEntry[] = (displays ?? [])
    .filter(display => display.model !== 'NONE')
    .map(display => ({
      key: display.model as ModuleKey,
      kind: 'display',
      label: display.label,
      description: display.description,
      does: pick(TEXTS).display,
      pins: display.pins,
      display,
    }));
  return [...sensorModules, ...displayModules];
}

export const isDisplayModule = (key?: string): key is Exclude<DisplayModelValue, 'NONE'> =>
  key === 'ST7565' || key === 'SSD1306' || key === 'SH1106';

/**
 * Name of a new device: "DHT11 temperature" for a module with several measurements, "Flame sensor" otherwise.
 */
export function defaultDeviceName(module: ModuleEntry, type: DeviceTypeValue) {
  const types = module.sensor?.supportedTypes ?? [];
  if (types.length > 1 && module.key !== 'ANALOG_INPUT') {
    return `${module.label} ${inSentence(DEVICE_TYPE_LABELS[type])}`;
  }
  return module.label;
}
