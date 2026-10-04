import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import { Loader } from '@src/components/Loader';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { fromNow } from '@src/lib/readings';
import { useGetControllersQuery } from '@src/redux/generatedApi';
import { ControllerWithRole, FirmwareBuild, useGetFirmwareManifestQuery } from '@src/redux/controllersApi';
import { BoardFirmware, isUpdating } from './DevicesPage/BoardFirmware';

// ESP Web Tools: flashing from the browser over Web Serial (Chrome / Edge on a computer)
const WEB_TOOLS = 'https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'esp-web-install-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        manifest: string;
      };
    }
  }
}

function useWebTools() {
  useEffect(() => {
    if (document.querySelector(`script[src="${WEB_TOOLS}"]`)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = WEB_TOOLS;
    document.head.appendChild(script);
  }, []);
}

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

/**
 * Firmware for the boards: what the latest version is, files to download, installing it over USB from the
 * browser and updating linked boards over the internet.
 */
export function FirmwarePage() {
  useWebTools();
  const { data: manifest, isLoading, error } = useGetFirmwareManifestQuery();
  const [polling, setPolling] = useState(false);
  const { data: controllers } = useGetControllersQuery(undefined, { pollingInterval: polling ? 3000 : 30000 });
  const boards = (controllers ?? []) as ControllerWithRole[];

  useEffect(() => {
    setPolling(boards.some(isUpdating));
  }, [controllers]);

  if (isLoading) return <Loader />;

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>Firmware</PageHeaderTitle>
          <PageHeaderDescription>
            One firmware for every supported board. Install it once over USB, later updates come from the site.
          </PageHeaderDescription>
        </div>
      </PageHeader>

      {error || !manifest ? (
        <Card className="text-sm text-slate-500">No firmware is published yet.</Card>
      ) : (
        <>
          <Card className="flex flex-wrap items-start gap-4">
            <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
              <Icon icon="lucide:cpu" className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xl font-semibold">Version {manifest.version}</div>
              <div className="text-sm text-slate-500">
                Released {fromNow(manifest.date)}
                {manifest.commit && <> · build {manifest.commit}</>}
              </div>
              {manifest.notes && <p className="mt-2 text-sm text-slate-700">{manifest.notes}</p>}
            </div>
          </Card>

          <section className="space-y-3">
            <h2 className="font-semibold">Boards</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {manifest.builds.map(build => (
                <BuildCard key={build.board} build={build} />
              ))}
              {(manifest.planned ?? []).map(planned => (
                <Card key={planned.board} className="flex flex-col gap-2 border-dashed text-slate-500">
                  <div className="font-semibold">{planned.label}</div>
                  <div className="text-sm">Coming{planned.note ? `: ${planned.note}` : ''}.</div>
                </Card>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Your boards</h2>
        {boards.length === 0 ? (
          <Card className="text-sm text-slate-500">No boards linked yet.</Card>
        ) : (
          <Card className="divide-y divide-black/5 p-0">
            {boards.map(board => (
              <div key={board.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Icon icon="lucide:cpu" className="size-4 text-slate-500" />
                <span className="font-medium">{board.name}</span>
                <span className="font-mono text-xs text-slate-500">
                  {board.board ?? board.platform} · fw {board.firmwareVersion ?? '?'}
                </span>
                <span className={`rounded-full px-2 text-xs text-white ${board.online ? 'bg-green-500' : 'bg-gray-500'}`}>
                  {board.online ? 'ONLINE' : 'OFFLINE'}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  {!board.availableFirmware && !board.firmwareUpdate && (
                    <span className="text-xs text-slate-500">up to date</span>
                  )}
                  <BoardFirmware controller={board} />
                </div>
              </div>
            ))}
          </Card>
        )}
        <p className="text-xs text-slate-500">
          A board downloads the update from this site over HTTPS, checks it and restarts; its settings and devices
          stay. Boards on firmware older than 2.4.0 have to be updated over USB once.
        </p>
      </section>
    </PageLayout>
  );
}

function BuildCard({ build }: { build: FirmwareBuild }) {
  const base = `${window.location.origin}/firmware/`;
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="font-semibold">{build.label}</div>
        <div className="text-xs text-slate-500">
          {build.chip} · {formatSize(build.size)}
        </div>
      </div>

      <esp-web-install-button manifest={base + build.install}>
        <button
          slot="activate"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          <Icon icon="lucide:usb" className="size-4" />
          Install over USB
        </button>
        <span slot="unsupported" className="text-xs text-slate-500">
          Installing from the browser needs Chrome or Edge on a computer. Download the file and flash it with
          esptool instead.
        </span>
        <span slot="not-allowed" className="text-xs text-slate-500">
          Installing from the browser needs a secure (https) page.
        </span>
      </esp-web-install-button>

      <div className="flex flex-col gap-1 text-sm">
        <a className="flex items-center gap-1.5 text-blue-700 hover:underline" href={base + build.fullFile} download>
          <Icon icon="lucide:download" className="size-4" />
          {build.fullFile}
          <span className="text-xs text-slate-500">(flash at 0x0)</span>
        </a>
        {build.fullFile !== build.file && (
          <a className="flex items-center gap-1.5 text-blue-700 hover:underline" href={base + build.file} download>
            <Icon icon="lucide:download" className="size-4" />
            {build.file}
            <span className="text-xs text-slate-500">(application only, for OTA)</span>
          </a>
        )}
        <div className="truncate font-mono text-[11px] text-slate-400" title={build.sha256}>
          SHA-256 {build.sha256}
        </div>
      </div>
    </Card>
  );
}
