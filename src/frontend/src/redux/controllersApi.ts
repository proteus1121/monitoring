import { Controller, DeviceTypeValue, SensorModel, generatedApi } from './generatedApi';

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

// language of the screens on the board's display
export type DisplayLanguageValue = 'UK' | 'EN';

// development board the chip sits on (BoardModel on the server), picked by the user for the diagram
export type BoardModelValue = 'NODEMCU' | 'D1_MINI' | 'ESP32_DEVKIT';

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
export type FirmwareUpdateStatus = {
  // REQUESTED, DOWNLOADING, DONE (restarting), FAILED, TIMEOUT
  state: string;
  progress: number;
  version?: string | null;
  error?: string | null;
  updatedAt: string;
};

export type ControllerWithRole = Controller & {
  role?: DeviceRoleValue;
  boardModel?: BoardModelValue;
  display?: DisplaySettings;
  displayLanguage?: DisplayLanguageValue;
  displayFound?: boolean | null;
  // firmware build (platformio env): esp8266, esp32dev, ...
  board?: string | null;
  // newer firmware published for this board
  availableFirmware?: string | null;
  firmwareUpdate?: FirmwareUpdateStatus | null;
};

// /firmware/manifest.json, published with the site by CI (firmware tools/firmware_manifest.py)
export type FirmwareBuild = {
  board: string;
  label: string;
  chip: string;
  file: string;
  size: number;
  md5: string;
  sha256: string;
  fullFile: string;
  // the file to download; missing in manifests published before them
  fullSize?: number;
  fullSha256?: string;
  install: string;
};

// the board's own MQTT login, passed back to the board through the browser
export type BoardConnection = {
  controller: Controller;
  userId: number;
  mqttUsername: string;
  mqttPassword: string;
  mqttHost: string;
  mqttPort: number;
};

export type FirmwareManifest = {
  version: string;
  date: string;
  commit?: string | null;
  notes?: string | null;
  builds: FirmwareBuild[];
  planned?: { board: string; label: string; note?: string }[];
};

export type SuggestedDevice = {
  name: string;
  type: DeviceTypeValue;
  sensorModel: SensorModel;
  pin: number;
  secondaryPin?: number | null;
};

export type ScanFinding = {
  // SENSOR: identified; DISPLAY: a display; CHOOSE: something on the pin, pick the module; UNSUPPORTED: no driver
  kind: 'SENSOR' | 'DISPLAY' | 'CHOOSE' | 'UNSUPPORTED';
  title: string;
  pins: number[];
  // TEMPERATURE, HUMIDITY, PRESSURE, LEVEL (0 / 1), ANALOG (raw ADC)
  readings: Record<string, number>;
  note?: string | null;
  options: { model: SensorModel; label: string; devices: SuggestedDevice[] }[];
  display?: DisplaySettings | null;
};

export type BoardScan = {
  status: 'PENDING' | 'DONE' | 'TIMEOUT';
  requestedAt: string;
  finishedAt?: string | null;
  scannedPins: number[];
  findings: ScanFinding[];
};

// last raw ADC value of an analog sensor, to calibrate it (RawReadingService on the server)
export type RawReading = { value: number; timestamp: string };

export const controllersApi = generatedApi.injectEndpoints({
  endpoints: build => ({
    // null (204) when the board sent none since the server started
    getRawReading: build.query<RawReading | null, { id: number }>({
      query: ({ id }) => ({ url: `/devices/${id}/raw` }),
    }),
    getDisplayModels: build.query<DisplayModelInfo[], void>({
      query: () => ({ url: `/controllers/display-models` }),
      providesTags: ['Controller Management'],
    }),
    updateBoardModel: build.mutation<ControllerWithRole, { id: number; boardModel: BoardModelValue }>({
      query: ({ id, ...body }) => ({ url: `/controllers/${id}/board-model`, method: 'PUT', body }),
      invalidatesTags: ['Controller Management'],
    }),
    updateDisplayLanguage: build.mutation<ControllerWithRole, { id: number; language: DisplayLanguageValue }>({
      query: ({ id, ...body }) => ({ url: `/controllers/${id}/display-language`, method: 'PUT', body }),
      invalidatesTags: ['Controller Management'],
    }),
    updateDisplay: build.mutation<ControllerWithRole, { id: number } & DisplaySettings>({
      query: ({ id, ...body }) => ({ url: `/controllers/${id}/display`, method: 'PUT', body }),
      invalidatesTags: ['Controller Management'],
    }),
    // served by the site itself, not the API
    getFirmwareManifest: build.query<FirmwareManifest, void>({
      query: () => ({ url: `${window.location.origin}/firmware/manifest.json`, credentials: 'omit' }),
    }),
    updateFirmware: build.mutation<FirmwareUpdateStatus, { id: number }>({
      query: ({ id }) => ({ url: `/controllers/${id}/firmware-update`, method: 'POST' }),
      invalidatesTags: ['Controller Management'],
    }),
    scanController: build.mutation<BoardScan, { id: number }>({
      query: ({ id }) => ({ url: `/controllers/${id}/scan`, method: 'POST' }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(controllersApi.util.upsertQueryData('getBoardScan', { id }, data));
      },
    }),
    // null (204) when the board was not scanned since the server started
    getBoardScan: build.query<BoardScan | null, { id: number }>({
      query: ({ id }) => ({ url: `/controllers/${id}/scan` }),
    }),
    // from Sign in on the board's page (pages/ConnectPage.tsx)
    connectController: build.mutation<
      BoardConnection,
      { hardwareId: string; platform?: string; firmwareVersion?: string; back: string }
    >({
      query: body => ({ url: `/controllers/connect`, method: 'POST', body }),
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
  useGetFirmwareManifestQuery,
  useUpdateFirmwareMutation,
  useScanControllerMutation,
  useGetBoardScanQuery,
  useGetDisplayModelsQuery,
  useUpdateDisplayMutation,
  useUpdateDisplayLanguageMutation,
  useUpdateBoardModelMutation,
  useGetRawReadingQuery,
  useConnectControllerMutation,
  useGetControllerSharesQuery,
  useShareControllerMutation,
  useUnshareControllerMutation,
} = controllersApi;
