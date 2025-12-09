import { api } from "./api";
export const addTagTypes = [
  "Notifications",
  "Device Management",
  "Users",
  "Metrics",
  "Incident Management",
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
            start: queryArg.start,
          },
        }),
        invalidatesTags: ["Metrics"],
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
      getUsers: build.query<GetUsersApiResponse, GetUsersApiArg>({
        query: () => ({ url: `/users` }),
        providesTags: ["Users"],
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
export type PredictMetricsApiResponse = unknown;
export type PredictMetricsApiArg = {
  deviceId: number;
  start: string;
};
export type ResolveIncidentApiResponse = unknown;
export type ResolveIncidentApiArg = {
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
  telegramChatId?: string;
  type?: "INFO" | "WARNING" | "CRITICAL";
  template?: string;
};
export type TelegramNotificationRequest = {
  telegramChatId?: string;
  type?: "INFO" | "WARNING" | "CRITICAL";
  template?: string;
};
export type UserDevices = {
  id?: number;
  username?: string;
  role?: "OWNER" | "EDITOR" | "VIEWER";
};
export type Device = {
  id?: number;
  name?: string;
  description?: string;
  criticalValue?: number;
  lowerValue?: number;
  delay?: number;
  status?: "OK" | "WARNING" | "CRITICAL" | "OFFLINE";
  lastChecked?: string;
  type?:
    | "TEMPERATURE"
    | "HUMIDITY"
    | "LPG"
    | "CH4"
    | "SMOKE"
    | "FLAME"
    | "LIGHT"
    | "UNKNOWN";
  userDevices?: UserDevices[];
};
export type DeviceRequest = {
  name: string;
  description?: string;
  criticalValue?: number;
  lowerValue?: number;
  delay: number;
  type?:
    | "TEMPERATURE"
    | "HUMIDITY"
    | "LPG"
    | "CH4"
    | "SMOKE"
    | "FLAME"
    | "LIGHT"
    | "UNKNOWN";
  userIds?: number[];
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
  useGetAllDevicesQuery,
  useLazyGetAllDevicesQuery,
  useCreateDeviceMutation,
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useGetUserQuery,
  useLazyGetUserQuery,
  useGetMetricsQuery,
  useLazyGetMetricsQuery,
  useGetMetricsPredictedQuery,
  useLazyGetMetricsPredictedQuery,
  useGetAllIncidentsQuery,
  useLazyGetAllIncidentsQuery,
  useGetIncidentQuery,
  useLazyGetIncidentQuery,
} = injectedRtkApi;
