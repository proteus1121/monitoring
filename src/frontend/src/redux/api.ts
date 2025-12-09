import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const apiBaseURL = process.env.BASE_URL!;

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseURL,
    credentials: 'include',
  }),
  refetchOnFocus: true,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
