import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  CreateDeviceRequest,
  Device,
  DevicesResponse,
  LoginResponse,
  MetricsResponse,
  RegisterResponse,
  UpdateDeviceRequest,
} from './api.types';

type ApiResponse<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; message: string; status?: number };

export class Api {
  private client: AxiosInstance;
  private onUnauthorized;

  constructor(baseURL: string, onUnauthorized: () => void) {
    console.log(baseURL);
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
    this.onUnauthorized = onUnauthorized;
  }

  private async reqWrapper<T>(
    fn: () => Promise<AxiosResponse<T>>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fn();
      return { ok: true, data: response.data, status: response.status };
    } catch (error: any) {
      if (error?.status === 401) {
        this.onUnauthorized();
      }
      return {
        ok: false,
        message: error?.message ?? 'Unexpected error occurred',
        status: error?.status ?? undefined,
      };
    }
  }

  async login(username: string, password: string) {
    return this.reqWrapper<LoginResponse>(() =>
      this.client.post('/users/login', { username, password })
    );
  }

  async register(username: string, password: string) {
    return this.reqWrapper<RegisterResponse>(() =>
      this.client.post('/users/register', { username, password })
    );
  }

  async getDevices() {
    return this.reqWrapper<DevicesResponse>(() => this.client.get('/devices'));
  }

  async getMetricsByDevice(deviceId: number, start: Date, end: Date) {
    return this.reqWrapper<MetricsResponse>(() =>
      this.client.get('/metrics', {
        params: {
          deviceId,
          start: start.toISOString(),
          end: end.toISOString(),
        },
      })
    );
  }

  async deleteDevice(deviceId: number) {
    return this.reqWrapper<unknown>(() =>
      this.client.delete(`/devices/${deviceId}`)
    );
  }

  async updateDevice(device: UpdateDeviceRequest) {
    return this.reqWrapper<Device>(() =>
      this.client.put(`/devices/${device.id}`, device)
    );
  }

  async createDevice(device: CreateDeviceRequest) {
    return this.reqWrapper<Device>(() => this.client.post('/devices', device));
  }
}
