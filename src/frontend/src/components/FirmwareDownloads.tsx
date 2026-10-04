import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import { fromNow } from '@src/lib/readings';
import { FirmwareBuild, FirmwareManifest } from '@src/redux/controllersApi';

// ESP Web Tools: flashing from the browser over Web Serial (Chrome / Edge on a computer)
const WEB_TOOLS =
  'https://unpkg.com/esp-web-tools@10/dist/web/install-button.js?module';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'esp-web-install-button': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
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
 * The published firmware for every board, for the first install over USB: the full image to download and
 * flash at 0x0, or installing it straight from the browser.
 */
export function FirmwareDownloads({
  manifest,
}: {
  manifest: FirmwareManifest;
}) {
  useWebTools();
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-500">
        Version {manifest.version} · released {fromNow(manifest.date)}
        {manifest.commit && <> · build {manifest.commit}</>}
        {manifest.notes && (
          <p className="mt-1 text-slate-700">{manifest.notes}</p>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {manifest.builds.map(build => (
          <BuildCard key={build.board} build={build} />
        ))}
        {(manifest.planned ?? []).map(planned => (
          <Card
            key={planned.board}
            className="flex flex-col gap-2 border-dashed text-slate-500"
          >
            <div className="font-semibold">{planned.label}</div>
            <div className="text-sm">
              Coming{planned.note ? `: ${planned.note}` : ''}.
            </div>
          </Card>
        ))}
      </div>
      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-900">
          Flashing the downloaded file
        </summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Connect the board to the computer with a USB data cable.</li>
          <li>
            Install esptool (
            <code className="font-mono text-xs">pip install esptool</code>) or
            use the Espressif Flash Download Tool on Windows.
          </li>
          <li>
            Flash the full image at address 0x0:{' '}
            <code className="font-mono text-xs">
              esptool.py write_flash 0x0 &lt;file&gt;.bin
            </code>
            . If it does not connect, hold BOOT / FLASH while it starts.
          </li>
          <li>
            The board restarts and opens its setup Wi-Fi. Later updates come
            from the site.
          </li>
        </ol>
      </details>
    </div>
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

      <a
        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        href={base + build.fullFile}
        download
      >
        <Icon icon="lucide:download" className="size-4" />
        Download for USB install
      </a>

      <esp-web-install-button manifest={base + build.install}>
        <button
          slot="activate"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-gray-50"
        >
          <Icon icon="lucide:usb" className="size-4" />
          Install from the browser
        </button>
        <span slot="unsupported" className="text-xs text-slate-500">
          Installing from the browser needs Chrome or Edge on a computer.
          Download the file and flash it with esptool instead.
        </span>
        <span slot="not-allowed" className="text-xs text-slate-500">
          Installing from the browser needs a secure (https) page.
        </span>
      </esp-web-install-button>

      <div className="flex flex-col gap-1 text-xs text-slate-500">
        <span>{build.fullFile} · flash at 0x0</span>
        {build.fullFile !== build.file && (
          <a
            className="flex items-center gap-1.5 text-blue-700 hover:underline"
            href={base + build.file}
            download
          >
            <Icon icon="lucide:download" className="size-3.5" />
            {build.file} (application only, for OTA)
          </a>
        )}
        <div
          className="truncate font-mono text-[11px] text-slate-400"
          title={build.sha256}
        >
          SHA-256 {build.sha256}
        </div>
      </div>
    </Card>
  );
}
