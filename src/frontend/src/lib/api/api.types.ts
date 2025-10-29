export type LoginResponseDto = any;
export type RegisterResponseDto = any;
export type DevicesResponseDto = Array<Device>;
export type MetricsResponseDto = Array<Metrics>;

export enum DeviceStatus {
  OK = 'OK',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  OFFLINE = 'OFFLINE',
}

export interface Device {
  id: number;
  userId?: number;
  name: string;
  description: string;
  criticalValue: number;
  status: DeviceStatus;
  lastChecked: string; // ISO date string
}

export interface Metrics {
  timestamp: string; // ISO date string
  value: number;
}
