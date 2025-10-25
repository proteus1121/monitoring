import axios, { AxiosInstance, AxiosResponse } from 'axios';

class Api {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    console.log(baseURL);
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });
  }

  private async reqWrapper<T>(
    fn: () => Promise<AxiosResponse<T>>
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fn();
      return { ok: true, data: response.data, status: response.status };
    } catch (error: any) {
      console.log(error);
      return {
        ok: false,
        message: error?.message ?? 'Unexpected error occurred',
        status: error?.status ?? undefined,
      };
    }
  }

  async login(username: string, password: string) {
    return this.reqWrapper<LoginResponseDto>(() =>
      this.client.post('/users/login', { username, password })
    );
  }

  async register(username: string, password: string) {
    return this.reqWrapper<RegisterResponseDto>(() =>
      this.client.post('/users/register', { username, password })
    );
  }

  async getDevices() {
    return this.reqWrapper<DevicesResponseDto>(() =>
      this.client.get('/devices')
    );
  }
}

type ApiResponse<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; message: string; status?: number };
type LoginResponseDto = any;
type RegisterResponseDto = any;
type DevicesResponseDto = Array<Device>;

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

export const api = new Api(process.env.BASE_URL!);
