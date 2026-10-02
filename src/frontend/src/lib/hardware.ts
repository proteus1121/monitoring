import type {
  Controller,
  DeviceTypeValue,
  SensorModelInfo,
} from '@src/redux/generatedApi';

export type PinOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type PinSpec = {
  gpio: number;
  label: string;
  analog?: boolean;
  inputOnly?: boolean;
  // occupied by the on-board display or serial log, firmware rejects it
  reserved?: boolean;
  // only usable by I2C modules sharing the display bus
  i2cOnly?: boolean;
};

// NodeMCU v2; the ST7565 display is wired to D2, D4, D5, D6, D7
const ESP8266_PINS: PinSpec[] = [
  { gpio: 16, label: 'D0 (GPIO16)' },
  { gpio: 5, label: 'D1 (GPIO5)' },
  { gpio: 4, label: 'D2 (GPIO4) - display', reserved: true },
  { gpio: 0, label: 'D3 (GPIO0) - must be HIGH at boot' },
  { gpio: 2, label: 'D4 (GPIO2) - display', reserved: true },
  { gpio: 14, label: 'D5 (GPIO14) - display', reserved: true },
  { gpio: 12, label: 'D6 (GPIO12) - display', reserved: true },
  { gpio: 13, label: 'D7 (GPIO13) - display', reserved: true },
  { gpio: 15, label: 'D8 (GPIO15) - must be LOW at boot' },
  { gpio: 3, label: 'RX (GPIO3)' },
  { gpio: 1, label: 'TX (GPIO1) - serial log', reserved: true },
  { gpio: 17, label: 'A0 (analog)', analog: true },
];

// ESP32 DevKit; the SSD1306 display uses I2C on GPIO27 (SDA) / GPIO14 (SCL)
const ESP32_PINS: PinSpec[] = [
  { gpio: 0, label: 'GPIO0 - BOOT button', reserved: true },
  { gpio: 2, label: 'GPIO2 - must be LOW at boot' },
  { gpio: 4, label: 'GPIO4' },
  { gpio: 5, label: 'GPIO5' },
  { gpio: 12, label: 'GPIO12 - must be LOW at boot' },
  { gpio: 13, label: 'GPIO13' },
  { gpio: 14, label: 'GPIO14 - display SCL', i2cOnly: true },
  { gpio: 15, label: 'GPIO15' },
  { gpio: 16, label: 'GPIO16' },
  { gpio: 17, label: 'GPIO17' },
  { gpio: 18, label: 'GPIO18' },
  { gpio: 19, label: 'GPIO19' },
  { gpio: 21, label: 'GPIO21' },
  { gpio: 22, label: 'GPIO22' },
  { gpio: 23, label: 'GPIO23' },
  { gpio: 25, label: 'GPIO25' },
  { gpio: 26, label: 'GPIO26' },
  { gpio: 27, label: 'GPIO27 - display SDA', i2cOnly: true },
  { gpio: 32, label: 'GPIO32 (ADC)', analog: true },
  { gpio: 33, label: 'GPIO33 (ADC)', analog: true },
  { gpio: 34, label: 'GPIO34 (ADC, input only)', analog: true, inputOnly: true },
  { gpio: 35, label: 'GPIO35 (ADC, input only)', analog: true, inputOnly: true },
  { gpio: 36, label: 'GPIO36 / VP (ADC, input only)', analog: true, inputOnly: true },
  { gpio: 39, label: 'GPIO39 / VN (ADC, input only)', analog: true, inputOnly: true },
];

function pinSpecs(platform?: string) {
  return platform === 'esp8266' ? ESP8266_PINS : ESP32_PINS;
}

export function getPinOptions(
  platform: string | undefined,
  model: SensorModelInfo | undefined
): PinOption[] {
  const isI2c = model?.model === 'BMP180';
  return pinSpecs(platform)
    .filter(pin => (model?.analog ? pin.analog : true))
    .filter(pin => !(model?.output && pin.inputOnly))
    .map(pin => ({
      value: String(pin.gpio),
      label: pin.label,
      disabled:
        pin.reserved ||
        (pin.i2cOnly && !isI2c) ||
        // ESP8266 A0 is analog only
        (platform === 'esp8266' && pin.analog && !model?.analog),
    }));
}

export function getPinLabel(platform: string | undefined, pin?: number) {
  if (pin === undefined || pin === null) return undefined;
  return (
    pinSpecs(platform)
      .find(spec => spec.gpio === pin)
      ?.label.split(' - ')[0] ?? `GPIO${pin}`
  );
}

export const DEVICE_TYPE_LABELS: Record<DeviceTypeValue, string> = {
  TEMPERATURE: 'Temperature',
  HUMIDITY: 'Humidity',
  LPG: 'LPG',
  CH4: 'Methane (CH4)',
  SMOKE: 'Smoke',
  FLAME: 'Flame',
  LIGHT: 'Light',
  PRESSURE: 'Pressure',
  MOTION: 'Motion',
  DIGITAL: 'Digital input',
  ANALOG: 'Analog input',
  RELAY: 'Relay',
  UNKNOWN: 'Unknown',
};

export function controllerPlatform(
  controllers: Controller[] | undefined,
  controllerId?: number
) {
  return controllers?.find(c => c.id === controllerId)?.platform;
}
