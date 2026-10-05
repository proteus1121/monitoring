import type { ModuleKey } from '@src/components/ModuleArt';
import type { DeviceType, SensorModel, SensorModelInfo, DisplayModelInfo, DisplayModel } from '@src/redux/generatedApi';
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

// one line under the module in the device and display forms; the server's own descriptions are in English
const MODEL_DESCRIPTIONS: Record<'uk' | 'en', Record<SensorModel | DisplayModel, string>> = {
  uk: {
    DHT11: 'Датчик температури й вологості',
    DHT22: 'Датчик температури й вологості',
    MQ2: 'Датчик газу (пропан, метан, дим)',
    BMP180: 'Барометр на шині I2C',
    FLAME_IR: 'Цифровий датчик полум’я, активний LOW',
    LIGHT_DIGITAL: 'Цифровий вихід модуля з фоторезистором, активний LOW',
    PIR: 'Датчик руху, активний HIGH',
    DIGITAL_INPUT: 'Будь-який цифровий вхід, HIGH = 1',
    SOIL_MOISTURE: 'Ємнісний або резистивний щуп, відсоток води в ґрунті',
    ANALOG_INPUT: 'Сире значення АЦП',
    RELAY: 'Вихід, який керується із сайту, HIGH = увімкнено',
    CAMERA: 'Плата сама виявляє полум’я в кадрі камери, живе відео на сторінці «Камери»',
    NONE: 'Плата працює без екрана',
    ST7565: 'Графічний РК-модуль на шині SPI',
    SSD1306: 'OLED 0,96″ на шині I2C, адреса 0x3C або 0x3D',
    SH1106: 'OLED 1,3″ на шині I2C, адреса 0x3C або 0x3D',
  },
  en: {
    DHT11: 'Temperature & humidity sensor',
    DHT22: 'Temperature & humidity sensor',
    MQ2: 'Gas sensor (LPG, methane, smoke)',
    BMP180: 'Barometer over I2C',
    FLAME_IR: 'Digital flame detector, active LOW',
    LIGHT_DIGITAL: 'Photoresistor module digital output, active LOW',
    PIR: 'Motion detector, active HIGH',
    DIGITAL_INPUT: 'Any digital input, HIGH = 1',
    SOIL_MOISTURE: 'Capacitive or resistive probe, % of water in the soil',
    ANALOG_INPUT: 'Raw ADC value',
    RELAY: 'Output controlled from the site, HIGH = on',
    CAMERA: 'Flame detected in the camera image on the board, live view on the Cameras page',
    NONE: 'The board runs without a screen',
    ST7565: 'Graphic LCD module over SPI',
    SSD1306: '0.96″ OLED over I2C, address 0x3C or 0x3D',
    SH1106: '1.3″ OLED over I2C, address 0x3C or 0x3D',
  },
};

/**
 * The description of a sensor or display model in the site's language, the server's one for a model added later.
 */
export function modelDescription(info?: { model?: SensorModel | DisplayModel; description?: string }) {
  return (info?.model && pick(MODEL_DESCRIPTIONS)[info.model]) || info?.description || '';
}

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

function joinTypes(types: DeviceType[]) {
  const names = types.map(type => inSentence(DEVICE_TYPE_LABELS[type]));
  const and = pick(TEXTS).and;
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}` : names[0] ?? '';
}

export function buildModules(sensors?: SensorModelInfo[], displays?: DisplayModelInfo[]): ModuleEntry[] {
  const sensorModules: ModuleEntry[] = (sensors ?? []).map(sensor => ({
    key: sensor.model as ModuleKey,
    kind: sensor.output ? 'output' : 'sensor',
    label: sensor.label ?? sensor.model!,
    description: modelDescription(sensor),
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
      description: modelDescription(display),
      does: pick(TEXTS).display,
      pins: display.pins,
      display,
    }));
  return [...sensorModules, ...displayModules];
}

export const isDisplayModule = (key?: string): key is Exclude<DisplayModel, 'NONE'> =>
  key === 'ST7565' || key === 'SSD1306' || key === 'SH1106';

/**
 * Name of a new device: "DHT11 temperature" for a module with several measurements, "Flame sensor" otherwise.
 */
export function defaultDeviceName(module: ModuleEntry, type: DeviceType) {
  const types = module.sensor?.supportedTypes ?? [];
  if (types.length > 1 && module.key !== 'ANALOG_INPUT') {
    return `${module.label} ${inSentence(DEVICE_TYPE_LABELS[type])}`;
  }
  return module.label;
}
