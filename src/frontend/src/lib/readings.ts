import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import type { Device } from '@src/redux/generatedApi';

dayjs.extend(relativeTime);
dayjs.extend(utc);

// The backend sends server time (UTC) without a zone
export function serverTime(timestamp?: string) {
  return timestamp ? dayjs.utc(timestamp).local() : undefined;
}

export function fromNow(timestamp?: string) {
  return serverTime(timestamp)?.fromNow() ?? '—';
}

const UNITS: Partial<Record<NonNullable<Device['type']>, string>> = {
  TEMPERATURE: '°C',
  HUMIDITY: '%',
  SOIL_MOISTURE: '%',
  PRESSURE: 'hPa',
  LPG: 'ppm',
  CH4: 'ppm',
  SMOKE: 'ppm',
};

// on / off style values
function isBinary(device: Device) {
  return (
    device.type === 'FLAME' ||
    device.type === 'MOTION' ||
    device.type === 'DIGITAL' ||
    device.type === 'RELAY' ||
    (device.type === 'LIGHT' && device.sensorModel !== 'ANALOG_INPUT')
  );
}

const BINARY_LABELS: Partial<Record<NonNullable<Device['type']>, [string, string]>> = {
  FLAME: ['Flame!', 'No flame'],
  MOTION: ['Motion', 'Still'],
  LIGHT: ['Light', 'Dark'],
  RELAY: ['On', 'Off'],
  DIGITAL: ['High', 'Low'],
};

export function formatReading(device: Device, value?: number) {
  if (value === undefined || value === null) {
    return { value: '—', unit: '' };
  }
  if (isBinary(device)) {
    const [on, off] = BINARY_LABELS[device.type!] ?? ['1', '0'];
    return { value: value >= 0.5 ? on : off, unit: '' };
  }
  const digits = Math.abs(value) >= 100 ? 0 : 1;
  return { value: value.toFixed(digits), unit: UNITS[device.type!] ?? '' };
}
