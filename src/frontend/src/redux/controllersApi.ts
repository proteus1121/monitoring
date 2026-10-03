import { Controller, generatedApi } from './generatedApi';

// Pairing and board sharing, written by hand until the deployed OpenAPI spec has them
// (npm run api-typegen reads it from the server). Remove once generatedApi.ts contains these endpoints.

export type DeviceRoleValue = 'OWNER' | 'EDITOR' | 'VIEWER';

export type ControllerShare = {
  controllerId: number;
  controllerName?: string;
  userId: number;
  username: string;
  role: DeviceRoleValue;
};

export type DisplayModelValue = 'NONE' | 'ST7565' | 'SSD1306' | 'SH1106';

// pins are GPIO numbers in the order of the model's pin names
export type DisplaySettings = { model: DisplayModelValue; pins: number[]; flip: boolean };

export type DisplayModelInfo = {
  model: DisplayModelValue;
  label: string;
  description: string;
  pins: string[];
  bus?: 'SPI' | 'I2C' | null;
};

// role of the current user: OWNER for own boards, EDITOR / VIEWER for boards shared with them;
// displayFound is false when the board did not find its display, undefined with older firmware
export type ControllerWithRole = Controller & {
  role?: DeviceRoleValue;
  display?: DisplaySettings;
  displayFound?: boolean | null;
};

export const controllersApi = generatedApi.injectEndpoints({
  endpoints: build => ({
    getDisplayModels: build.query<DisplayModelInfo[], void>({
      query: () => ({ url: `/controllers/display-models` }),
      providesTags: ['Controller Management'],
    }),
    updateDisplay: build.mutation<ControllerWithRole, { id: number } & DisplaySettings>({
      query: ({ id, ...body }) => ({ url: `/controllers/${id}/display`, method: 'PUT', body }),
      invalidatesTags: ['Controller Management'],
    }),
    pairController: build.mutation<Controller, { code: string }>({
      query: body => ({ url: `/controllers/pair`, method: 'POST', body }),
      invalidatesTags: ['Controller Management'],
    }),
    getControllerShares: build.query<ControllerShare[], void>({
      query: () => ({ url: `/controllers/shares` }),
      providesTags: ['Controller Management'],
    }),
    shareController: build.mutation<void, { id: number; username: string; role: DeviceRoleValue }>({
      query: ({ id, ...body }) => ({ url: `/controllers/${id}/share`, method: 'PUT', body }),
      invalidatesTags: ['Controller Management', 'Device Management'],
    }),
    unshareController: build.mutation<void, { id: number; userId: number }>({
      query: ({ id, userId }) => ({ url: `/controllers/${id}/share/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Controller Management', 'Device Management'],
    }),
  }),
});

export const {
  useGetDisplayModelsQuery,
  useUpdateDisplayMutation,
  usePairControllerMutation,
  useGetControllerSharesQuery,
  useShareControllerMutation,
  useUnshareControllerMutation,
} = controllersApi;
