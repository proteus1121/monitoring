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

// role of the current user: OWNER for own boards, EDITOR / VIEWER for boards shared with them
export type ControllerWithRole = Controller & { role?: DeviceRoleValue };

export const controllersApi = generatedApi.injectEndpoints({
  endpoints: build => ({
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
  usePairControllerMutation,
  useGetControllerSharesQuery,
  useShareControllerMutation,
  useUnshareControllerMutation,
} = controllersApi;
