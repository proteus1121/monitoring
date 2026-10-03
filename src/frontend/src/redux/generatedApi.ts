import { api } from "./api";
export const addTagTypes = [
  "Notifications",
  "Device Management",
  "Users",
  "Metrics",
  "Incident Management",
  "Controller Management",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      testNotification: build.mutation<
        TestNotificationApiResponse,
        TestNotificationApiArg
      >({
        query: (queryArg) => ({
          url: `/notifications/${queryArg.id}/test`,
          method: "POST",
        }),
      }),
      getNotificationChannels: build.query<
        GetNotificationChannelsApiResponse,
        GetNotificationChannelsApiArg
      >({
        query: () => ({ url: `/notifications/channels` }),
      }),
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
          invalidatesTags: ["Device Management", "Controller Management"],
        },
      ),
      deleteDevice: build.mutation<DeleteDeviceApiResponse, DeleteDeviceApiArg>(
        {
          query: (queryArg) => ({
            url: `/devices/${queryArg.id}`,
            method: "DELETE",
          }),
          invalidatesTags: ["Device Management", "Controller Management"],
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
        invalidatesTags: ["Metrics", "Device Management"],
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
      sendCommand: build.mutation<SendCommandApiResponse, SendCommandApiArg>({
        query: (queryArg) => ({
          url: `/devices/${queryArg.id}/command`,
          method: "POST",
          body: queryArg.deviceCommandRequest,
        }),
      }),
      getControllers: build.query<
        GetControllersApiResponse,
        GetControllersApiArg
      >({
        query: () => ({ url: `/controllers` }),
        providesTags: ["Controller Management"],
      }),
      getSensorModels: build.query<
        GetSensorModelsApiResponse,
        GetSensorModelsApiArg
      >({
        query: () => ({ url: `/controllers/sensor-models` }),
        providesTags: ["Controller Management"],
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
        invalidatesTags: ["Controller Management", "Device Management"],
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
          invalidatesTags: ["Device Management", "Controller Management"],
        },
      ),
      getUsers: build.query<GetUsersApiResponse, GetUsersApiArg>({
        query: () => ({ url: `/users` }),
        providesTags: ["Users"],
      }),
      getSsoProviders: build.query<
        GetSsoProvidersApiResponse,
        GetSsoProvidersApiArg
      >({
        query: () => ({ url: `/users/sso-providers` }),
      }),
      getUser: build.query<GetUserApiResponse, GetUserApiArg>({
        query: () => ({ url: `/users/me` }),
        providesTags: ["Users"],
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
      getRecentIncidents: build.query<
        GetRecentIncidentsApiResponse,
        GetRecentIncidentsApiArg
      >({
        query: (queryArg) => ({
          url: `/incidents/recent`,
          params: { openOnly: queryArg.openOnly, limit: queryArg.limit },
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
      resolveAllIncidents: build.mutation<
        ResolveAllIncidentsApiResponse,
        ResolveAllIncidentsApiArg
      >({
        query: () => ({ url: `/incidents/resolve-all`, method: "POST" }),
        invalidatesTags: ["Incident Management"],
      }),
      getLatestReadings: build.query<
        GetLatestReadingsApiResponse,
        GetLatestReadingsApiArg
      >({
        query: () => ({ url: `/metrics/latest` }),
        providesTags: ["Metrics"],
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
export type PredictMetricsApiResponse = /** status 200 OK */ ForecastResult;
export type PredictMetricsApiArg = {
  deviceId: number;
};
export type ForecastModel = "NONE" | "XGBOOST" | "ARIMA" | "KALMAN";
export type ForecastResult = {
  model?: ForecastModel;
  done?: boolean;
  message?: string;
  trainingHours?: number;
  forecastHours?: number;
  mae?: number;
  rmse?: number;
};
export type ForecastSettingsFields = {
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
};
export type NotificationChannel = "TELEGRAM" | "EMAIL";
export type TestNotificationApiResponse = unknown;
export type TestNotificationApiArg = { id: number };
export type GetNotificationChannelsApiResponse = /** status 200 OK */ {
  [channel: string]: boolean;
};
export type GetNotificationChannelsApiArg = void;
export type ResolveIncidentApiResponse = unknown;
export type ResolveIncidentApiArg = {
  id: number;
};
export type SendCommandApiResponse = unknown;
export type SendCommandApiArg = {
  id: number;
  deviceCommandRequest: DeviceCommandRequest;
};
export type GetControllersApiResponse = /** status 200 OK */ Controller[];
export type GetControllersApiArg = void;
export type GetSensorModelsApiResponse =
  /** status 200 OK */ SensorModelInfo[];
export type GetSensorModelsApiArg = void;
export type UpdateControllerApiResponse = /** status 200 OK */ Controller;
export type UpdateControllerApiArg = {
  id: number;
  controllerRequest: ControllerRequest;
};
export type DeleteControllerApiResponse = unknown;
export type DeleteControllerApiArg = {
  id: number;
};
export type SyncControllerApiResponse = unknown;
export type SyncControllerApiArg = {
  id: number;
};
export type GetAllDevicesApiResponse = /** status 200 OK */ Device[];
export type GetAllDevicesApiArg = void;
export type CreateDeviceApiResponse = /** status 200 OK */ Device;
export type CreateDeviceApiArg = {
  deviceRequest: DeviceRequest;
};
export type GetUsersApiResponse = /** status 200 OK */ {
  [key: string]: DeviceUser[];
};
export type GetUsersApiArg = void;
export type GetSsoProvidersApiResponse = /** status 200 OK */ string[];
export type GetSsoProvidersApiArg = void;
export type GetUserApiResponse = /** status 200 OK */ LoginResponse;
export type GetUserApiArg = void;
export type GetMetricsApiResponse = /** status 200 OK */ SensorData[];
export type GetMetricsApiArg = {
  deviceId: number;
  start: string;
  end: string;
  period?:
    | "LIVE"
    | "ONE_MINUTE"
    | "FIVE_MINUTES"
    | "FIFTEEN_MINUTES"
    | "THIRTY_MINUTES"
    | "ONE_HOUR"
    | "SIX_HOURS"
    | "TWELVE_HOURS"
    | "ONE_DAY";
};
export type GetMetricsPredictedApiResponse = /** status 200 OK */ SensorData[];
export type GetMetricsPredictedApiArg = {
  deviceId: number;
  start: string;
  end: string;
  period?:
    | "LIVE"
    | "ONE_MINUTE"
    | "FIVE_MINUTES"
    | "FIFTEEN_MINUTES"
    | "THIRTY_MINUTES"
    | "ONE_HOUR"
    | "SIX_HOURS"
    | "TWELVE_HOURS"
    | "ONE_DAY";
};
export type GetRecentIncidentsApiResponse = /** status 200 OK */ Incident[];
export type GetRecentIncidentsApiArg = {
  openOnly?: boolean;
  limit?: number;
};
export type GetOpenIncidentCountApiResponse = /** status 200 OK */ number;
export type GetOpenIncidentCountApiArg = void;
export type ResolveAllIncidentsApiResponse = /** status 200 OK */ number;
export type ResolveAllIncidentsApiArg = void;
export type GetLatestReadingsApiResponse =
  /** status 200 OK */ LatestReading[];
export type GetLatestReadingsApiArg = void;
export type LatestReading = {
  deviceId: number;
  timestamp: string;
  value: number;
};
export type GetAllIncidentsApiResponse = /** status 200 OK */ Incident[];
export type GetAllIncidentsApiArg = void;
export type GetIncidentApiResponse = /** status 200 OK */ Incident;
export type GetIncidentApiArg = {
  id: number;
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
export type TelegramNotification = {
  id?: number;
  user?: User;
  channel?: NotificationChannel;
  email?: string;
  telegramChatId?: string;
  type?: "INFO" | "WARNING" | "CRITICAL";
  template?: string;
};
export type TelegramNotificationRequest = {
  channel?: NotificationChannel;
  email?: string;
  telegramChatId?: string;
  type?: "INFO" | "WARNING" | "CRITICAL";
  template?: string;
};
export type UserDevices = {
  id?: number;
  username?: string;
  role?: "OWNER" | "EDITOR" | "VIEWER";
};
export type Device = ForecastSettingsFields & {
  forecastMae?: number;
  forecastRmse?: number;
  forecastUpdatedAt?: string;
  id?: number;
  name?: string;
  description?: string;
  criticalValue?: number;
  lowerValue?: number;
  delay?: number;
  status?: "OK" | "WARNING" | "CRITICAL" | "OFFLINE";
  lastChecked?: string;
  type?: DeviceTypeValue;
  controllerId?: number;
  sensorModel?: SensorModel;
  pin?: number;
  secondaryPin?: number;
  userDevices?: UserDevices[];
};
export type DeviceRequest = ForecastSettingsFields & {
  name: string;
  description?: string;
  criticalValue?: number;
  lowerValue?: number;
  delay: number;
  type?: DeviceTypeValue;
  controllerId?: number;
  sensorModel?: SensorModel;
  pin?: number;
  secondaryPin?: number;
  userIds?: number[];
};
export type DeviceTypeValue =
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
  | "ANALOG_INPUT"
  | "RELAY";
export type DeviceCommandRequest = {
  value: number;
};
export type Controller = {
  id?: number;
  userId?: number;
  hardwareId?: string;
  name?: string;
  platform?: string;
  firmwareVersion?: string;
  ipAddress?: string;
  lastSeen?: string;
  online?: boolean;
  synced?: boolean;
  deviceCount?: number;
};
export type ControllerRequest = {
  name: string;
};
export type SensorModelInfo = {
  model?: SensorModel;
  label?: string;
  description?: string;
  supportedTypes?: DeviceTypeValue[];
  pins?: string[];
  analog?: boolean;
  output?: boolean;
};
export type UnshareDeviceRequest = {
  deviceIds?: number[];
  username: string;
};
export type ShareDeviceRequest = {
  deviceIds?: number[];
  username: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
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
export type DeviceUser = {
  id?: number;
  deviceName?: string;
  role?: "OWNER" | "EDITOR" | "VIEWER";
};
export type SensorData = {
  timestamp?: string;
  value?: number;
};
export type Incident = {
  id?: number;
  message?: string;
  devices?: Device[];
  status?: "UNRESOLVED" | "ACKNOWLEDGED" | "RESOLVED" | "RESOLVED_MANUALLY";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  created?: string;
};
export const {
  useTestNotificationMutation,
  useGetNotificationChannelsQuery,
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
  useCreateUserMutation,
  useLoginMutation,
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useCreateNotificationMutation,
  usePredictMetricsMutation,
  useResolveIncidentMutation,
  useSendCommandMutation,
  useGetControllersQuery,
  useLazyGetControllersQuery,
  useGetSensorModelsQuery,
  useUpdateControllerMutation,
  useDeleteControllerMutation,
  useSyncControllerMutation,
  useGetAllDevicesQuery,
  useLazyGetAllDevicesQuery,
  useCreateDeviceMutation,
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useGetSsoProvidersQuery,
  useGetUserQuery,
  useLazyGetUserQuery,
  useGetMetricsQuery,
  useLazyGetMetricsQuery,
  useGetMetricsPredictedQuery,
  useLazyGetMetricsPredictedQuery,
  useGetRecentIncidentsQuery,
  useGetOpenIncidentCountQuery,
  useResolveAllIncidentsMutation,
  useGetLatestReadingsQuery,
  useGetAllIncidentsQuery,
  useLazyGetAllIncidentsQuery,
  useGetIncidentQuery,
  useLazyGetIncidentQuery,
} = injectedRtkApi;
