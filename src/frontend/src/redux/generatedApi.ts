import { api } from "./api";
export const addTagTypes = [
  "Notifications",
  "Device Management",
  "Controller Management",
  "Telegram Webhook",
  "Users",
  "Metrics",
  "Text generation",
  "Incident Management",
  "Cameras",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getNotificationById: build.query<
        GetNotificationByIdApiResponse,
        GetNotificationByIdApiArg
      >({
        query: (queryArg) => ({ url: `/notifications/${queryArg.id}` }),
        providesTags: ["Notifications"],
      }),
      updateNotification: build.mutation<
        UpdateNotificationApiResponse,
        UpdateNotificationApiArg
      >({
        query: (queryArg) => ({
          url: `/notifications/${queryArg.id}`,
          method: "PUT",
          body: queryArg.telegramNotificationRequest,
        }),
        invalidatesTags: ["Notifications"],
      }),
      deleteNotification: build.mutation<
        DeleteNotificationApiResponse,
        DeleteNotificationApiArg
      >({
        query: (queryArg) => ({
          url: `/notifications/${queryArg.id}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Notifications"],
      }),
      getDeviceById: build.query<GetDeviceByIdApiResponse, GetDeviceByIdApiArg>(
        {
          query: (queryArg) => ({ url: `/devices/${queryArg.id}` }),
          providesTags: ["Device Management"],
        },
      ),
      updateDevice: build.mutation<UpdateDeviceApiResponse, UpdateDeviceApiArg>(
        {
          query: (queryArg) => ({
            url: `/devices/${queryArg.id}`,
            method: "PUT",
            body: queryArg.deviceRequest,
          }),
          invalidatesTags: ["Device Management"],
        },
      ),
      deleteDevice: build.mutation<DeleteDeviceApiResponse, DeleteDeviceApiArg>(
        {
          query: (queryArg) => ({
            url: `/devices/${queryArg.id}`,
            method: "DELETE",
          }),
          invalidatesTags: ["Device Management"],
        },
      ),
      unshareDevice: build.mutation<
        UnshareDeviceApiResponse,
        UnshareDeviceApiArg
      >({
        query: (queryArg) => ({
          url: `/devices/unshare`,
          method: "PUT",
          body: queryArg.unshareDeviceRequest,
        }),
        invalidatesTags: ["Device Management"],
      }),
      shareDevice: build.mutation<ShareDeviceApiResponse, ShareDeviceApiArg>({
        query: (queryArg) => ({
          url: `/devices/share`,
          method: "PUT",
          body: queryArg.shareDeviceRequest,
        }),
        invalidatesTags: ["Device Management"],
      }),
      updateController: build.mutation<
        UpdateControllerApiResponse,
        UpdateControllerApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}`,
          method: "PUT",
          body: queryArg.controllerRequest,
        }),
        invalidatesTags: ["Controller Management"],
      }),
      deleteController: build.mutation<
        DeleteControllerApiResponse,
        DeleteControllerApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Controller Management"],
      }),
      shareController: build.mutation<
        ShareControllerApiResponse,
        ShareControllerApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}/share`,
          method: "PUT",
          body: queryArg.shareControllerRequest,
        }),
        invalidatesTags: ["Controller Management"],
      }),
      updateDisplay: build.mutation<
        UpdateDisplayApiResponse,
        UpdateDisplayApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}/display`,
          method: "PUT",
          body: queryArg.displayRequest,
        }),
        invalidatesTags: ["Controller Management"],
      }),
      updateDisplayLanguage: build.mutation<
        UpdateDisplayLanguageApiResponse,
        UpdateDisplayLanguageApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}/display-language`,
          method: "PUT",
          body: queryArg.displayLanguageRequest,
        }),
        invalidatesTags: ["Controller Management"],
      }),
      updateBoardModel: build.mutation<
        UpdateBoardModelApiResponse,
        UpdateBoardModelApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}/board-model`,
          method: "PUT",
          body: queryArg.boardModelRequest,
        }),
        invalidatesTags: ["Controller Management"],
      }),
      handleWebhook: build.mutation<
        HandleWebhookApiResponse,
        HandleWebhookApiArg
      >({
        query: (queryArg) => ({
          url: `/webhook/telegram`,
          method: "POST",
          body: queryArg.telegramWebhookRequest,
        }),
        invalidatesTags: ["Telegram Webhook"],
      }),
      createUser: build.mutation<CreateUserApiResponse, CreateUserApiArg>({
        query: (queryArg) => ({
          url: `/users/register`,
          method: "POST",
          body: queryArg.userRequest,
        }),
        invalidatesTags: ["Users"],
      }),
      login: build.mutation<LoginApiResponse, LoginApiArg>({
        query: (queryArg) => ({
          url: `/users/login`,
          method: "POST",
          body: queryArg.loginRequest,
        }),
        invalidatesTags: ["Users"],
      }),
      getNotifications: build.query<
        GetNotificationsApiResponse,
        GetNotificationsApiArg
      >({
        query: () => ({ url: `/notifications` }),
        providesTags: ["Notifications"],
      }),
      createNotification: build.mutation<
        CreateNotificationApiResponse,
        CreateNotificationApiArg
      >({
        query: (queryArg) => ({
          url: `/notifications`,
          method: "POST",
          body: queryArg.telegramNotificationRequest,
        }),
        invalidatesTags: ["Notifications"],
      }),
      testNotification: build.mutation<
        TestNotificationApiResponse,
        TestNotificationApiArg
      >({
        query: (queryArg) => ({
          url: `/notifications/${queryArg.id}/test`,
          method: "POST",
        }),
        invalidatesTags: ["Notifications"],
      }),
      predictMetrics: build.mutation<
        PredictMetricsApiResponse,
        PredictMetricsApiArg
      >({
        query: (queryArg) => ({
          url: `/metrics/predict`,
          method: "POST",
          params: {
            deviceId: queryArg.deviceId,
          },
        }),
        invalidatesTags: ["Metrics"],
      }),
      describeDevice: build.mutation<
        DescribeDeviceApiResponse,
        DescribeDeviceApiArg
      >({
        query: (queryArg) => ({
          url: `/llm/device-description`,
          method: "POST",
          body: queryArg.deviceRequest,
        }),
        invalidatesTags: ["Text generation"],
      }),
      resolveIncident: build.mutation<
        ResolveIncidentApiResponse,
        ResolveIncidentApiArg
      >({
        query: (queryArg) => ({
          url: `/incidents/${queryArg.id}/resolve`,
          method: "POST",
        }),
        invalidatesTags: ["Incident Management"],
      }),
      resolveAllIncidents: build.mutation<
        ResolveAllIncidentsApiResponse,
        ResolveAllIncidentsApiArg
      >({
        query: () => ({ url: `/incidents/resolve-all`, method: "POST" }),
        invalidatesTags: ["Incident Management"],
      }),
      getAllDevices: build.query<GetAllDevicesApiResponse, GetAllDevicesApiArg>(
        {
          query: () => ({ url: `/devices` }),
          providesTags: ["Device Management"],
        },
      ),
      createDevice: build.mutation<CreateDeviceApiResponse, CreateDeviceApiArg>(
        {
          query: (queryArg) => ({
            url: `/devices`,
            method: "POST",
            body: queryArg.deviceRequest,
          }),
          invalidatesTags: ["Device Management"],
        },
      ),
      sendCommand: build.mutation<SendCommandApiResponse, SendCommandApiArg>({
        query: (queryArg) => ({
          url: `/devices/${queryArg.id}/command`,
          method: "POST",
          body: queryArg.deviceCommandRequest,
        }),
        invalidatesTags: ["Device Management"],
      }),
      syncController: build.mutation<
        SyncControllerApiResponse,
        SyncControllerApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}/sync`,
          method: "POST",
        }),
        invalidatesTags: ["Controller Management"],
      }),
      getBoardScan: build.query<GetBoardScanApiResponse, GetBoardScanApiArg>({
        query: (queryArg) => ({ url: `/controllers/${queryArg.id}/scan` }),
        providesTags: ["Controller Management"],
      }),
      scanController: build.mutation<
        ScanControllerApiResponse,
        ScanControllerApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}/scan`,
          method: "POST",
        }),
        invalidatesTags: ["Controller Management"],
      }),
      updateFirmware: build.mutation<
        UpdateFirmwareApiResponse,
        UpdateFirmwareApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}/firmware-update`,
          method: "POST",
        }),
        invalidatesTags: ["Controller Management"],
      }),
      connectController: build.mutation<
        ConnectControllerApiResponse,
        ConnectControllerApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/connect`,
          method: "POST",
          body: queryArg.connectControllerRequest,
        }),
        invalidatesTags: ["Controller Management"],
      }),
      getReport: build.query<GetReportApiResponse, GetReportApiArg>({
        query: (queryArg) => ({
          url: `/webhook/telegram/report/${queryArg.chatId}`,
        }),
        providesTags: ["Telegram Webhook"],
      }),
      getUsers: build.query<GetUsersApiResponse, GetUsersApiArg>({
        query: () => ({ url: `/users` }),
        providesTags: ["Users"],
      }),
      getSsoProviders: build.query<
        GetSsoProvidersApiResponse,
        GetSsoProvidersApiArg
      >({
        query: () => ({ url: `/users/sso-providers` }),
        providesTags: ["Users"],
      }),
      getUser: build.query<GetUserApiResponse, GetUserApiArg>({
        query: () => ({ url: `/users/me` }),
        providesTags: ["Users"],
      }),
      getNotificationChannels: build.query<
        GetNotificationChannelsApiResponse,
        GetNotificationChannelsApiArg
      >({
        query: () => ({ url: `/notifications/channels` }),
        providesTags: ["Notifications"],
      }),
      getMetrics: build.query<GetMetricsApiResponse, GetMetricsApiArg>({
        query: (queryArg) => ({
          url: `/metrics`,
          params: {
            deviceId: queryArg.deviceId,
            start: queryArg.start,
            end: queryArg.end,
            period: queryArg.period,
          },
        }),
        providesTags: ["Metrics"],
      }),
      getMetricsPredicted: build.query<
        GetMetricsPredictedApiResponse,
        GetMetricsPredictedApiArg
      >({
        query: (queryArg) => ({
          url: `/metrics/predicted`,
          params: {
            deviceId: queryArg.deviceId,
            start: queryArg.start,
            end: queryArg.end,
            period: queryArg.period,
          },
        }),
        providesTags: ["Metrics"],
      }),
      getLatestReadings: build.query<
        GetLatestReadingsApiResponse,
        GetLatestReadingsApiArg
      >({
        query: () => ({ url: `/metrics/latest` }),
        providesTags: ["Metrics"],
      }),
      getLlmStatus: build.query<GetLlmStatusApiResponse, GetLlmStatusApiArg>({
        query: () => ({ url: `/llm/status` }),
        providesTags: ["Text generation"],
      }),
      getAllIncidents: build.query<
        GetAllIncidentsApiResponse,
        GetAllIncidentsApiArg
      >({
        query: () => ({ url: `/incidents` }),
        providesTags: ["Incident Management"],
      }),
      getIncident: build.query<GetIncidentApiResponse, GetIncidentApiArg>({
        query: (queryArg) => ({ url: `/incidents/${queryArg.id}` }),
        providesTags: ["Incident Management"],
      }),
      getRecentIncidents: build.query<
        GetRecentIncidentsApiResponse,
        GetRecentIncidentsApiArg
      >({
        query: (queryArg) => ({
          url: `/incidents/recent`,
          params: {
            openOnly: queryArg.openOnly,
            limit: queryArg.limit,
          },
        }),
        providesTags: ["Incident Management"],
      }),
      getOpenIncidentCount: build.query<
        GetOpenIncidentCountApiResponse,
        GetOpenIncidentCountApiArg
      >({
        query: () => ({ url: `/incidents/open-count` }),
        providesTags: ["Incident Management"],
      }),
      getRawReading: build.query<GetRawReadingApiResponse, GetRawReadingApiArg>(
        {
          query: (queryArg) => ({ url: `/devices/${queryArg.id}/raw` }),
          providesTags: ["Device Management"],
        },
      ),
      getControllers: build.query<
        GetControllersApiResponse,
        GetControllersApiArg
      >({
        query: () => ({ url: `/controllers` }),
        providesTags: ["Controller Management"],
      }),
      getControllerShares: build.query<
        GetControllerSharesApiResponse,
        GetControllerSharesApiArg
      >({
        query: () => ({ url: `/controllers/shares` }),
        providesTags: ["Controller Management"],
      }),
      getSensorModels: build.query<
        GetSensorModelsApiResponse,
        GetSensorModelsApiArg
      >({
        query: () => ({ url: `/controllers/sensor-models` }),
        providesTags: ["Controller Management"],
      }),
      getDisplayModels: build.query<
        GetDisplayModelsApiResponse,
        GetDisplayModelsApiArg
      >({
        query: () => ({ url: `/controllers/display-models` }),
        providesTags: ["Controller Management"],
      }),
      getCameras: build.query<GetCamerasApiResponse, GetCamerasApiArg>({
        query: () => ({ url: `/cameras` }),
        providesTags: ["Cameras"],
      }),
      getVision: build.query<GetVisionApiResponse, GetVisionApiArg>({
        query: (queryArg) => ({ url: `/cameras/${queryArg.id}/vision` }),
        providesTags: ["Cameras"],
      }),
      stream: build.query<StreamApiResponse, StreamApiArg>({
        query: (queryArg) => ({ url: `/cameras/${queryArg.id}/stream` }),
        providesTags: ["Cameras"],
      }),
      getSnapshot: build.query<GetSnapshotApiResponse, GetSnapshotApiArg>({
        query: (queryArg) => ({ url: `/cameras/${queryArg.id}/snapshot` }),
        providesTags: ["Cameras"],
      }),
      unshareController: build.mutation<
        UnshareControllerApiResponse,
        UnshareControllerApiArg
      >({
        query: (queryArg) => ({
          url: `/controllers/${queryArg.id}/share/${queryArg.userId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Controller Management"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as generatedApi };
export type GetNotificationByIdApiResponse =
  /** status 200 OK */ TelegramNotification;
export type GetNotificationByIdApiArg = {
  id: number;
};
export type UpdateNotificationApiResponse =
  /** status 200 OK */ TelegramNotification;
export type UpdateNotificationApiArg = {
  id: number;
  telegramNotificationRequest: TelegramNotificationRequest;
};
export type DeleteNotificationApiResponse = unknown;
export type DeleteNotificationApiArg = {
  id: number;
};
export type GetDeviceByIdApiResponse = /** status 200 OK */ Device;
export type GetDeviceByIdApiArg = {
  id: number;
};
export type UpdateDeviceApiResponse = /** status 200 OK */ Device;
export type UpdateDeviceApiArg = {
  id: number;
  deviceRequest: DeviceRequest;
};
export type DeleteDeviceApiResponse = unknown;
export type DeleteDeviceApiArg = {
  id: number;
};
export type UnshareDeviceApiResponse = /** status 200 OK */ Device;
export type UnshareDeviceApiArg = {
  unshareDeviceRequest: UnshareDeviceRequest;
};
export type ShareDeviceApiResponse = /** status 200 OK */ Device;
export type ShareDeviceApiArg = {
  shareDeviceRequest: ShareDeviceRequest;
};
export type UpdateControllerApiResponse = /** status 200 OK */ Controller;
export type UpdateControllerApiArg = {
  id: number;
  controllerRequest: ControllerRequest;
};
export type DeleteControllerApiResponse = unknown;
export type DeleteControllerApiArg = {
  id: number;
};
export type ShareControllerApiResponse = unknown;
export type ShareControllerApiArg = {
  id: number;
  shareControllerRequest: ShareControllerRequest;
};
export type UpdateDisplayApiResponse = /** status 200 OK */ Controller;
export type UpdateDisplayApiArg = {
  id: number;
  displayRequest: DisplayRequest;
};
export type UpdateDisplayLanguageApiResponse = /** status 200 OK */ Controller;
export type UpdateDisplayLanguageApiArg = {
  id: number;
  displayLanguageRequest: DisplayLanguageRequest;
};
export type UpdateBoardModelApiResponse = /** status 200 OK */ Controller;
export type UpdateBoardModelApiArg = {
  id: number;
  boardModelRequest: BoardModelRequest;
};
export type HandleWebhookApiResponse = /** status 200 OK */ string;
export type HandleWebhookApiArg = {
  telegramWebhookRequest: TelegramWebhookRequest;
};
export type CreateUserApiResponse = unknown;
export type CreateUserApiArg = {
  userRequest: UserRequest;
};
export type LoginApiResponse = /** status 200 OK */ LoginResponse;
export type LoginApiArg = {
  loginRequest: LoginRequest;
};
export type GetNotificationsApiResponse =
  /** status 200 OK */ TelegramNotification[];
export type GetNotificationsApiArg = void;
export type CreateNotificationApiResponse =
  /** status 200 OK */ TelegramNotification;
export type CreateNotificationApiArg = {
  telegramNotificationRequest: TelegramNotificationRequest;
};
export type TestNotificationApiResponse = unknown;
export type TestNotificationApiArg = {
  id: number;
};
export type PredictMetricsApiResponse = /** status 200 OK */ ForecastResult;
export type PredictMetricsApiArg = {
  deviceId: number;
};
export type DescribeDeviceApiResponse = /** status 200 OK */ {
  [key: string]: string;
};
export type DescribeDeviceApiArg = {
  deviceRequest: DeviceRequest;
};
export type ResolveIncidentApiResponse = unknown;
export type ResolveIncidentApiArg = {
  id: number;
};
export type ResolveAllIncidentsApiResponse = /** status 200 OK */ number;
export type ResolveAllIncidentsApiArg = void;
export type GetAllDevicesApiResponse = /** status 200 OK */ Device[];
export type GetAllDevicesApiArg = void;
export type CreateDeviceApiResponse = /** status 200 OK */ Device;
export type CreateDeviceApiArg = {
  deviceRequest: DeviceRequest;
};
export type SendCommandApiResponse = unknown;
export type SendCommandApiArg = {
  id: number;
  deviceCommandRequest: DeviceCommandRequest;
};
export type SyncControllerApiResponse = unknown;
export type SyncControllerApiArg = {
  id: number;
};
export type GetBoardScanApiResponse = /** status 200 OK */ BoardScan;
export type GetBoardScanApiArg = {
  id: number;
};
export type ScanControllerApiResponse = /** status 200 OK */ BoardScan;
export type ScanControllerApiArg = {
  id: number;
};
export type UpdateFirmwareApiResponse =
  /** status 200 OK */ FirmwareUpdateStatus;
export type UpdateFirmwareApiArg = {
  id: number;
};
export type ConnectControllerApiResponse = /** status 200 OK */ BoardConnection;
export type ConnectControllerApiArg = {
  connectControllerRequest: ConnectControllerRequest;
};
export type GetReportApiResponse = /** status 200 OK */ DeviceSensorValues[];
export type GetReportApiArg = {
  chatId: string;
};
export type GetUsersApiResponse = /** status 200 OK */ {
  [key: string]: DeviceUser[];
};
export type GetUsersApiArg = void;
export type GetSsoProvidersApiResponse = /** status 200 OK */ string[];
export type GetSsoProvidersApiArg = void;
export type GetUserApiResponse = /** status 200 OK */ LoginResponse;
export type GetUserApiArg = void;
export type GetNotificationChannelsApiResponse = /** status 200 OK */ {
  [key: string]: boolean;
};
export type GetNotificationChannelsApiArg = void;
export type GetMetricsApiResponse = /** status 200 OK */ SensorData[];
export type GetMetricsApiArg = {
  deviceId: number;
  start: string;
  end: string;
  period?: Period;
};
export type GetMetricsPredictedApiResponse = /** status 200 OK */ SensorData[];
export type GetMetricsPredictedApiArg = {
  deviceId: number;
  start: string;
  end: string;
  period?: Period;
};
export type GetLatestReadingsApiResponse = /** status 200 OK */ LatestReading[];
export type GetLatestReadingsApiArg = void;
export type GetLlmStatusApiResponse = /** status 200 OK */ {
  [key: string]: object;
};
export type GetLlmStatusApiArg = void;
export type GetAllIncidentsApiResponse = /** status 200 OK */ Incident[];
export type GetAllIncidentsApiArg = void;
export type GetIncidentApiResponse = /** status 200 OK */ Incident;
export type GetIncidentApiArg = {
  id: number;
};
export type GetRecentIncidentsApiResponse = /** status 200 OK */ Incident[];
export type GetRecentIncidentsApiArg = {
  openOnly?: boolean;
  limit?: number;
};
export type GetOpenIncidentCountApiResponse = /** status 200 OK */ number;
export type GetOpenIncidentCountApiArg = void;
export type GetRawReadingApiResponse = /** status 200 OK */ RawReading;
export type GetRawReadingApiArg = {
  id: number;
};
export type GetControllersApiResponse = /** status 200 OK */ Controller[];
export type GetControllersApiArg = void;
export type GetControllerSharesApiResponse =
  /** status 200 OK */ ControllerShare[];
export type GetControllerSharesApiArg = void;
export type GetSensorModelsApiResponse = /** status 200 OK */ SensorModelInfo[];
export type GetSensorModelsApiArg = void;
export type GetDisplayModelsApiResponse =
  /** status 200 OK */ DisplayModelInfo[];
export type GetDisplayModelsApiArg = void;
export type GetCamerasApiResponse = /** status 200 OK */ Camera[];
export type GetCamerasApiArg = void;
export type GetVisionApiResponse = /** status 200 OK */ CameraVision;
export type GetVisionApiArg = {
  id: number;
};
export type StreamApiResponse = unknown;
export type StreamApiArg = {
  id: number;
};
export type GetSnapshotApiResponse = unknown;
export type GetSnapshotApiArg = {
  id: number;
};
export type UnshareControllerApiResponse = unknown;
export type UnshareControllerApiArg = {
  id: number;
  userId: number;
};
export type GrantedAuthority = {
  authority?: string;
};
export type User = {
  username?: string;
  authorities?: GrantedAuthority[];
  accountNonExpired?: boolean;
  accountNonLocked?: boolean;
  credentialsNonExpired?: boolean;
  enabled?: boolean;
  id?: number;
};
export type NotificationChannel = "TELEGRAM" | "EMAIL";
export type NotificationType = "INFO" | "WARNING" | "CRITICAL";
export type TelegramNotification = {
  id?: number;
  user?: User;
  channel?: NotificationChannel;
  telegramChatId?: string;
  email?: string;
  type?: NotificationType;
  template?: string;
};
export type TelegramNotificationRequest = {
  channel?: NotificationChannel;
  telegramChatId?: string;
  email?: string;
  type?: NotificationType;
  template?: string;
};
export type DeviceStatus = "OK" | "WARNING" | "CRITICAL" | "OFFLINE";
export type DeviceType =
  | "TEMPERATURE"
  | "HUMIDITY"
  | "LPG"
  | "CH4"
  | "SMOKE"
  | "FLAME"
  | "LIGHT"
  | "PRESSURE"
  | "MOTION"
  | "DIGITAL"
  | "ANALOG"
  | "RELAY"
  | "SOIL_MOISTURE"
  | "UNKNOWN";
export type SensorModel =
  | "DHT11"
  | "DHT22"
  | "MQ2"
  | "BMP180"
  | "FLAME_IR"
  | "LIGHT_DIGITAL"
  | "PIR"
  | "DIGITAL_INPUT"
  | "SOIL_MOISTURE"
  | "ANALOG_INPUT"
  | "RELAY"
  | "CAMERA";
export type ForecastModel = "NONE" | "XGBOOST" | "ARIMA" | "KALMAN";
export type DeviceRole = "OWNER" | "EDITOR" | "VIEWER";
export type DeviceUser = {
  deviceId?: number;
  userId?: number;
  username?: string;
  deviceName?: string;
  role?: DeviceRole;
};
export type Device = {
  id?: number;
  name?: string;
  description?: string;
  criticalValue?: number;
  lowerValue?: number;
  delay?: number;
  status?: DeviceStatus;
  lastChecked?: string;
  type?: DeviceType;
  controllerId?: number;
  sensorModel?: SensorModel;
  pin?: number;
  secondaryPin?: number;
  calibrationDry?: number;
  calibrationWet?: number;
  forecastModel?: ForecastModel;
  forecastHorizonHours?: number;
  forecastHistoryDays?: number;
  arimaP?: number;
  arimaD?: number;
  arimaQ?: number;
  kalmanProcessNoise?: number;
  kalmanMeasurementNoise?: number;
  xgbRounds?: number;
  xgbMaxDepth?: number;
  forecastMae?: number;
  forecastRmse?: number;
  forecastUpdatedAt?: string;
  userDevices?: DeviceUser[];
};
export type DeviceRequest = {
  name: string;
  description?: string;
  criticalValue?: number;
  lowerValue?: number;
  delay: number;
  type?: DeviceType;
  controllerId?: number;
  sensorModel?: SensorModel;
  pin?: number;
  secondaryPin?: number;
  calibrationDry?: number;
  calibrationWet?: number;
  forecastModel?: ForecastModel;
  forecastHorizonHours?: number;
  forecastHistoryDays?: number;
  arimaP?: number;
  arimaD?: number;
  arimaQ?: number;
  kalmanProcessNoise?: number;
  kalmanMeasurementNoise?: number;
  xgbRounds?: number;
  xgbMaxDepth?: number;
  userIds?: number[];
};
export type UnshareDeviceRequest = {
  deviceIds?: number[];
  username: string;
};
export type ShareDeviceRequest = {
  deviceIds?: number[];
  username: string;
  role: DeviceRole;
};
export type BoardModel = "NODEMCU" | "D1_MINI" | "ESP32_DEVKIT" | "ESP32_CAM";
export type DisplayModel = "NONE" | "ST7565" | "SSD1306" | "SH1106";
export type DisplaySettings = {
  model: DisplayModel;
  pins: number[];
  flip: boolean;
};
export type DisplayLanguage = "UK" | "EN";
export type FirmwareUpdateStatus = {
  state: string;
  progress: number;
  version?: string;
  error?: string;
  updatedAt: string;
};
export type Controller = {
  id?: number;
  userId?: number;
  role?: DeviceRole;
  hardwareId?: string;
  name?: string;
  platform?: string;
  board?: string;
  boardModel?: BoardModel;
  firmwareVersion?: string;
  ipAddress?: string;
  lastSeen?: string;
  online?: boolean;
  synced?: boolean;
  deviceCount?: number;
  display?: DisplaySettings;
  displayLanguage?: DisplayLanguage;
  displayFound?: boolean;
  cameraFound?: boolean;
  availableFirmware?: string;
  firmwareUpdate?: FirmwareUpdateStatus;
};
export type ControllerRequest = {
  name: string;
};
export type ShareControllerRequest = {
  username: string;
  role: DeviceRole;
};
export type DisplayRequest = {
  model: DisplayModel;
  pins?: number[];
  flip?: boolean;
};
export type DisplayLanguageRequest = {
  language: DisplayLanguage;
};
export type BoardModelRequest = {
  boardModel: BoardModel;
};
export type Chat = {
  id?: number;
  type?: string;
};
export type Message = {
  message_id?: number;
  from?: User;
  chat?: Chat;
  text?: string;
};
export type TelegramWebhookRequest = {
  update_id?: number;
  message?: Message;
};
export type UserRequest = {
  username: string;
  password: string;
};
export type LoginResponse = {
  userId?: number;
  name?: string;
  SESSION?: string;
};
export type LoginRequest = {
  username: string;
  password: string;
};
export type ForecastResult = {
  model?: ForecastModel;
  done?: boolean;
  message?: string;
  trainingHours?: number;
  forecastHours?: number;
  mae?: number;
  rmse?: number;
};
export type DeviceCommandRequest = {
  value: number;
};
export type ScanStatus = "PENDING" | "DONE" | "TIMEOUT";
export type FindingKind = "SENSOR" | "DISPLAY" | "CHOOSE" | "UNSUPPORTED";
export type SuggestedDevice = {
  name: string;
  type: DeviceType;
  sensorModel: SensorModel;
  pin: number;
  secondaryPin?: number;
};
export type ScanOption = {
  model: SensorModel;
  label: string;
  devices: SuggestedDevice[];
};
export type ScanFinding = {
  kind: FindingKind;
  title: string;
  pins: number[];
  readings: {
    [key: string]: number;
  };
  note?: string;
  options: ScanOption[];
  display?: DisplaySettings;
};
export type BoardScan = {
  status: ScanStatus;
  requestedAt: string;
  finishedAt?: string;
  scannedPins: number[];
  findings: ScanFinding[];
};
export type BoardConnection = {
  controller: Controller;
  userId: number;
  mqttUsername: string;
  mqttPassword: string;
  mqttHost: string;
  mqttPort: number;
};
export type ConnectControllerRequest = {
  hardwareId: string;
  platform?: string;
  firmwareVersion?: string;
  back: string;
};
export type SensorValue = {
  value?: number;
  timestamp?: string;
};
export type DeviceSensorValues = {
  deviceId?: number;
  deviceName?: string;
  deviceDescription?: string;
  values?: {
    [key: string]: SensorValue;
  };
  lastUpdated?: string;
};
export type SensorData = {
  timestamp?: string;
  value?: number;
};
export type Period =
  | "LIVE"
  | "ONE_MINUTE"
  | "FIVE_MINUTES"
  | "FIFTEEN_MINUTES"
  | "THIRTY_MINUTES"
  | "ONE_HOUR"
  | "SIX_HOURS"
  | "TWELVE_HOURS"
  | "ONE_DAY";
export type LatestReading = {
  deviceId: number;
  timestamp: string;
  value?: number;
};
export type Resolution =
  | "UNRESOLVED"
  | "ACKNOWLEDGED"
  | "RESOLVED"
  | "RESOLVED_MANUALLY";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Incident = {
  id?: number;
  message?: string;
  description?: string;
  devices?: Device[];
  status?: Resolution;
  severity?: Severity;
  created?: string;
};
export type RawReading = {
  value: number;
  timestamp: string;
};
export type ControllerShare = {
  controllerId: number;
  controllerName?: string;
  userId: number;
  username: string;
  role: DeviceRole;
};
export type SensorModelInfo = {
  model?: SensorModel;
  label?: string;
  description?: string;
  supportedTypes?: DeviceType[];
  pins?: string[];
  analog?: boolean;
  output?: boolean;
};
export type DisplayModelInfo = {
  model: DisplayModel;
  label: string;
  description: string;
  pins: string[];
  bus?: string;
};
export type CameraVision = {
  alarm: boolean;
  ratio: number;
  variance: number;
  consec: number;
  confirm: number;
  box?: number[];
  width: number;
  height: number;
  fps: number;
  cameraFps: number;
  mean?: number[];
  received: string;
};
export type Camera = {
  controllerId: number;
  name: string;
  hardwareId: string;
  role: DeviceRole;
  online: boolean;
  cameraFound?: boolean;
  firmwareVersion?: string;
  flameDeviceId?: number;
  vision?: CameraVision;
};
export const {
  useGetNotificationByIdQuery,
  useLazyGetNotificationByIdQuery,
  useUpdateNotificationMutation,
  useDeleteNotificationMutation,
  useGetDeviceByIdQuery,
  useLazyGetDeviceByIdQuery,
  useUpdateDeviceMutation,
  useDeleteDeviceMutation,
  useUnshareDeviceMutation,
  useShareDeviceMutation,
  useUpdateControllerMutation,
  useDeleteControllerMutation,
  useShareControllerMutation,
  useUpdateDisplayMutation,
  useUpdateDisplayLanguageMutation,
  useUpdateBoardModelMutation,
  useHandleWebhookMutation,
  useCreateUserMutation,
  useLoginMutation,
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useCreateNotificationMutation,
  useTestNotificationMutation,
  usePredictMetricsMutation,
  useDescribeDeviceMutation,
  useResolveIncidentMutation,
  useResolveAllIncidentsMutation,
  useGetAllDevicesQuery,
  useLazyGetAllDevicesQuery,
  useCreateDeviceMutation,
  useSendCommandMutation,
  useSyncControllerMutation,
  useGetBoardScanQuery,
  useLazyGetBoardScanQuery,
  useScanControllerMutation,
  useUpdateFirmwareMutation,
  useConnectControllerMutation,
  useGetReportQuery,
  useLazyGetReportQuery,
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useGetSsoProvidersQuery,
  useLazyGetSsoProvidersQuery,
  useGetUserQuery,
  useLazyGetUserQuery,
  useGetNotificationChannelsQuery,
  useLazyGetNotificationChannelsQuery,
  useGetMetricsQuery,
  useLazyGetMetricsQuery,
  useGetMetricsPredictedQuery,
  useLazyGetMetricsPredictedQuery,
  useGetLatestReadingsQuery,
  useLazyGetLatestReadingsQuery,
  useGetLlmStatusQuery,
  useLazyGetLlmStatusQuery,
  useGetAllIncidentsQuery,
  useLazyGetAllIncidentsQuery,
  useGetIncidentQuery,
  useLazyGetIncidentQuery,
  useGetRecentIncidentsQuery,
  useLazyGetRecentIncidentsQuery,
  useGetOpenIncidentCountQuery,
  useLazyGetOpenIncidentCountQuery,
  useGetRawReadingQuery,
  useLazyGetRawReadingQuery,
  useGetControllersQuery,
  useLazyGetControllersQuery,
  useGetControllerSharesQuery,
  useLazyGetControllerSharesQuery,
  useGetSensorModelsQuery,
  useLazyGetSensorModelsQuery,
  useGetDisplayModelsQuery,
  useLazyGetDisplayModelsQuery,
  useGetCamerasQuery,
  useLazyGetCamerasQuery,
  useGetVisionQuery,
  useLazyGetVisionQuery,
  useStreamQuery,
  useLazyStreamQuery,
  useGetSnapshotQuery,
  useLazyGetSnapshotQuery,
  useUnshareControllerMutation,
} = injectedRtkApi;
