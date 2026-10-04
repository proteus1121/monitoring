import { generatedApi } from './generatedApi';

// What the generated client (npm run api-typegen) cannot know: the firmware manifest served by the site, the scan
// result cached for the board, and caches the server changes as a side effect.

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

export type FirmwareManifest = {
  version: string;
  date: string;
  commit?: string | null;
  notes?: string | null;
  builds: FirmwareBuild[];
  planned?: { board: string; label: string; note?: string }[];
};

export const controllersApi = generatedApi
  .enhanceEndpoints({
    endpoints: {
      // a device belongs to a board: the board's device count and configuration change with it
      updateDevice: { invalidatesTags: ['Device Management', 'Controller Management'] },
      deleteDevice: { invalidatesTags: ['Device Management', 'Controller Management'] },
      createDevice: { invalidatesTags: ['Device Management', 'Controller Management'] },
      // sharing a board shares its devices
      shareController: { invalidatesTags: ['Controller Management', 'Device Management'] },
      unshareController: { invalidatesTags: ['Controller Management', 'Device Management'] },
      deleteController: { invalidatesTags: ['Controller Management', 'Device Management'] },
      // a forecast stores its error (MAE) in the device
      predictMetrics: { invalidatesTags: ['Metrics', 'Device Management'] },
      scanController: {
        // the started scan is shown at once, then polled with getBoardScan
        async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
          const { data } = await queryFulfilled;
          dispatch(generatedApi.util.upsertQueryData('getBoardScan', { id }, data));
        },
      },
    },
  })
  .injectEndpoints({
    endpoints: build => ({
      // served by the site itself, not the API
      getFirmwareManifest: build.query<FirmwareManifest, void>({
        query: () => ({ url: `${window.location.origin}/firmware/manifest.json`, credentials: 'omit' }),
      }),
    }),
  });

export const { useGetFirmwareManifestQuery } = controllersApi;
