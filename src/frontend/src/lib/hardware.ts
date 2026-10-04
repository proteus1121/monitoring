import type {
  Controller,
  DeviceTypeValue,
  SensorModelInfo,
} from '@src/redux/generatedApi';
import type { DisplayModelValue, DisplaySettings } from '@src/redux/controllersApi';

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
  // FLASH / BOOT button or serial log, firmware rejects it
  reserved?: boolean;
};

// NodeMCU v2; display pins depend on the board's display settings
const ESP8266_PINS: PinSpec[] = [
  { gpio: 16, label: 'D0 (GPIO16)' },
  { gpio: 5, label: 'D1 (GPIO5)' },
  { gpio: 4, label: 'D2 (GPIO4)' },
  { gpio: 0, label: 'D3 (GPIO0) - FLASH button', reserved: true },
  { gpio: 2, label: 'D4 (GPIO2) - must be HIGH at boot' },
  { gpio: 14, label: 'D5 (GPIO14)' },
  { gpio: 12, label: 'D6 (GPIO12)' },
  { gpio: 13, label: 'D7 (GPIO13)' },
  { gpio: 15, label: 'D8 (GPIO15) - must be LOW at boot' },
  { gpio: 3, label: 'RX (GPIO3) - unplug to flash over USB' },
  { gpio: 1, label: 'TX (GPIO1) - serial log', reserved: true },
  { gpio: 17, label: 'A0 (analog)', analog: true },
];

// ESP32 DevKit
const ESP32_PINS: PinSpec[] = [
  { gpio: 0, label: 'GPIO0 - BOOT button', reserved: true },
  { gpio: 2, label: 'GPIO2 - must be LOW at boot' },
  { gpio: 4, label: 'GPIO4' },
  { gpio: 5, label: 'GPIO5' },
  { gpio: 12, label: 'GPIO12 - must be LOW at boot' },
  { gpio: 13, label: 'GPIO13' },
  { gpio: 14, label: 'GPIO14' },
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
  { gpio: 27, label: 'GPIO27' },
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

// pin names of each display, in the order of DisplaySettings.pins (same as DisplayModel on the server)
export const DISPLAY_PIN_NAMES: Record<DisplayModelValue, string[]> = {
  NONE: [],
  ST7565: ['CLK', 'DIN', 'CS', 'DC', 'RST'],
  SSD1306: ['SDA', 'SCL'],
  SH1106: ['SDA', 'SCL'],
};

export const isI2cDisplay = (display?: DisplaySettings) =>
  display?.model === 'SSD1306' || display?.model === 'SH1106';

// "display SDA" when the display uses the pin
export function displayPinName(display: DisplaySettings | undefined, gpio?: number) {
  if (!display || gpio === undefined) return undefined;
  const index = display.pins.indexOf(gpio);
  return index < 0 ? undefined : `display ${DISPLAY_PIN_NAMES[display.model]?.[index] ?? ''}`.trim();
}

export function getPinOptions(
  platform: string | undefined,
  model: SensorModelInfo | undefined,
  display?: DisplaySettings
): PinOption[] {
  // a BMP180 may share the bus of an I2C display
  const sharesDisplayBus = model?.model === 'BMP180' && isI2cDisplay(display);
  return pinSpecs(platform)
    .filter(pin => (model?.analog ? pin.analog : true))
    .filter(pin => !(model?.output && pin.inputOnly))
    .map(pin => {
      const displayPin = displayPinName(display, pin.gpio);
      return {
        value: String(pin.gpio),
        label: displayPin ? `${pin.label.split(' - ')[0]} - ${displayPin}` : pin.label,
        disabled:
          pin.reserved ||
          (!!displayPin && !sharesDisplayBus) ||
          // ESP8266 A0 is analog only
          (platform === 'esp8266' && pin.analog && !model?.analog),
      };
    });
}

/**
 * Pins for a display: not the reserved ones, not analog-only or input-only, and not the pins of
 * devices (except a BMP180 on the bus of an I2C display).
 */
export function getDisplayPinOptions(
  platform: string | undefined,
  usedBy: Map<number, { name: string; i2cShareable: boolean }>,
  i2c: boolean
): PinOption[] {
  return pinSpecs(platform)
    .filter(pin => !pin.inputOnly && !(platform === 'esp8266' && pin.analog))
    .map(pin => {
      const user = usedBy.get(pin.gpio);
      const busy = !!user && !(i2c && user.i2cShareable);
      return {
        value: String(pin.gpio),
        label: user ? `${pin.label.split(' - ')[0]} - ${user.name}` : pin.label,
        disabled: pin.reserved || busy,
      };
    });
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
  SOIL_MOISTURE: 'Soil moisture',
  UNKNOWN: 'Unknown',
};

export function controllerPlatform(
  controllers: Controller[] | undefined,
  controllerId?: number
) {
  return controllers?.find(c => c.id === controllerId)?.platform;
}

export type BoardPin = {
  label: string;
  gpio?: number;
};

export type BoardLayout = {
  name: string;
  // header rows top to bottom, the USB connector is at the bottom
  left: BoardPin[];
  right: BoardPin[];
};

const NODEMCU_LAYOUT: BoardLayout = {
  name: 'NodeMCU v2 (ESP8266)',
  left: [
    { label: 'A0', gpio: 17 },
    { label: 'RSV' },
    { label: 'RSV' },
    { label: 'SD3', gpio: 10 },
    { label: 'SD2', gpio: 9 },
    { label: 'SD1' },
    { label: 'CMD' },
    { label: 'SD0' },
    { label: 'CLK' },
    { label: 'GND' },
    { label: '3V3' },
    { label: 'EN' },
    { label: 'RST' },
    { label: 'GND' },
    { label: 'VIN' },
  ],
  right: [
    { label: 'D0', gpio: 16 },
    { label: 'D1', gpio: 5 },
    { label: 'D2', gpio: 4 },
    { label: 'D3', gpio: 0 },
    { label: 'D4', gpio: 2 },
    { label: '3V3' },
    { label: 'GND' },
    { label: 'D5', gpio: 14 },
    { label: 'D6', gpio: 12 },
    { label: 'D7', gpio: 13 },
    { label: 'D8', gpio: 15 },
    { label: 'RX', gpio: 3 },
    { label: 'TX', gpio: 1 },
    { label: 'GND' },
    { label: '3V3' },
  ],
};

const ESP32_DEVKIT_LAYOUT: BoardLayout = {
  name: 'ESP32 DevKit',
  left: [
    { label: 'EN' },
    { label: 'VP', gpio: 36 },
    { label: 'VN', gpio: 39 },
    { label: 'D34', gpio: 34 },
    { label: 'D35', gpio: 35 },
    { label: 'D32', gpio: 32 },
    { label: 'D33', gpio: 33 },
    { label: 'D25', gpio: 25 },
    { label: 'D26', gpio: 26 },
    { label: 'D27', gpio: 27 },
    { label: 'D14', gpio: 14 },
    { label: 'D12', gpio: 12 },
    { label: 'GND' },
    { label: 'D13', gpio: 13 },
    { label: 'VIN' },
  ],
  right: [
    { label: 'D23', gpio: 23 },
    { label: 'D22', gpio: 22 },
    { label: 'TX0', gpio: 1 },
    { label: 'RX0', gpio: 3 },
    { label: 'D21', gpio: 21 },
    { label: 'D19', gpio: 19 },
    { label: 'D18', gpio: 18 },
    { label: 'D5', gpio: 5 },
    { label: 'TX2', gpio: 17 },
    { label: 'RX2', gpio: 16 },
    { label: 'D4', gpio: 4 },
    { label: 'D2', gpio: 2 },
    { label: 'D15', gpio: 15 },
    { label: 'GND' },
    { label: '3V3' },
  ],
};

export function boardLayout(platform?: string): BoardLayout {
  return platform === 'esp8266' ? NODEMCU_LAYOUT : ESP32_DEVKIT_LAYOUT;
}

// What the pin is taken by on this board (display, serial, ...), undefined when free
export function reservedPinNote(platform: string | undefined, gpio?: number, display?: DisplaySettings) {
  if (gpio === undefined) return undefined;
  const displayPin = displayPinName(display, gpio);
  if (displayPin) return displayPin;
  const spec = pinSpecs(platform).find(pin => pin.gpio === gpio);
  if (!spec || !spec.reserved) return undefined;
  return spec.label.split(' - ')[1];
}
