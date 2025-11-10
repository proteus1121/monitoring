export type LoginResponse = any;
export type RegisterResponse = any;
export type DevicesResponse = Array<Device>;
export type MetricsResponse = Array<Metrics>;
export type TelegramNotificationResponse = Array<TelegramNotification>;
export type CreateDeviceRequest = DeviceRequest;
export type UpdateDeviceRequest = DeviceRequest & { id: number };

export type DeviceRequest = {
  name: string;
  description?: string;
  criticalValue?: number;
  lowerValue?: number;
  delay?: number;
  deviceType?: DeviceType;
};

export type Device = {
  id?: number;
  userId?: number;
  name?: string;
  description?: string;
  criticalValue?: number;
  lowerValue?: number;
  delay?: number;
  status?: DeviceStatus;
  lastChecked?: string;
  type?: DeviceType;
};

export enum DeviceStatus {
  OK = 'OK',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  OFFLINE = 'OFFLINE',
}

export enum DeviceType {
  TEMPERATURE = 'TEMPERATURE',
  HUMIDITY = 'HUMIDITY',
  LPG = 'LPG',
  CH4 = 'CH4',
  SMOKE = 'SMOKE',
  FLAME = 'FLAME',
  LIGHT = 'LIGHT',
  UNKNOWN = 'UNKNOWN',
}

export enum NotificationType {
  INFO = 'INFO', 
  WARNING = 'WARNING', 
  CRITICAL = 'CRITICAL'
}

export const NOTIFICATION_TYPES: NotificationType[] = Object.values(NotificationType);

export interface Metrics {
  timestamp: string; // ISO date string
  value: number;
}

export type TelegramNotification = {
  id: number;
  user?: { id?: number; username?: string; email?: string };
  telegramChatId: string;
  type: NotificationType;
  template: string;
};

export type CreateTelegramNotificationRequest = {
  telegramChatId: string;
  type: string;
  template: string;
};

export type UpdateTelegramNotificationRequest = CreateTelegramNotificationRequest & {
  id: number;
};
