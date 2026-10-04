import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Card } from '@src/components/Card';
import { BoardArt } from '@src/components/BoardArt';
import { fromNow } from '@src/lib/readings';
import { useTexts } from '@src/lib/lang';
import { BoardModelValue, FirmwareBuild, FirmwareManifest } from '@src/redux/controllersApi';

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

type Board = {
  model: BoardModelValue;
  label: string;
  chip: string;
  // the firmware build (platformio env) the board runs
  build: string;
};

// the firmware cannot tell a NodeMCU from a D1 mini: both run the ESP8266 build
const BOARDS: Board[] = [
  { model: 'NODEMCU', label: 'NodeMCU v2', chip: 'ESP8266', build: 'esp8266' },
  { model: 'D1_MINI', label: 'Wemos D1 mini', chip: 'ESP8266', build: 'esp8266' },
  { model: 'ESP32_DEVKIT', label: 'ESP32 DevKit', chip: 'ESP32', build: 'esp32dev' },
];

const TEXTS = {
  uk: {
    version: (version: string, date: string) => `Версія ${version} · випущена ${date}`,
    build: 'збірка',
    noFirmware: 'Прошивку ще не опубліковано.',
    notes: {
      NODEMCU: [
        'Аналоговий вхід: A0 (один на платі).',
        'Кнопка FLASH (GPIO0): коротке натискання гортає сторінки дисплея, утримання 3 с відкриває сторінку налаштування.',
      ],
      D1_MINI: [
        'Аналоговий вхід: A0 (один на платі).',
        'Кнопки FLASH немає: щоб відкрити сторінку налаштування, після старту замкніть D3 (GPIO0) на GND на 3 с (під час старту це вмикає режим прошивки).',
      ],
      ESP32_DEVKIT: [
        'Аналогові входи: GPIO32–39 (ADC2 не працює разом із Wi-Fi).',
        'Кнопка BOOT (GPIO0): коротке натискання гортає сторінки дисплея, утримання 3 с відкриває сторінку налаштування.',
      ],
    } as Record<BoardModelValue, string[]>,
    download: 'Завантажити для USB',
    install: 'Встановити з браузера',
    unsupported: 'Встановлення з браузера працює в Chrome або Edge на комп’ютері. Завантажте файл і прошийте його через esptool.',
    notAllowed: 'Встановлення з браузера потребує захищеної (https) сторінки.',
    flashAt: 'прошивати з адреси 0x0',
    coming: 'Незабаром',
    howTitle: 'Як прошити завантажений файл',
    how: [
      'Під’єднайте плату до комп’ютера USB-кабелем для передачі даних.',
      'Встановіть esptool (pip install esptool) або Flash Download Tool від Espressif на Windows.',
      'Прошийте повний образ з адреси 0x0: esptool.py write_flash 0x0 <файл>.bin. Якщо не з’єднується, тримайте BOOT / FLASH під час старту.',
      'Плата перезапуститься й увімкне свою Wi-Fi-мережу налаштування. Подальші оновлення приходять із сайту.',
    ],
  },
  en: {
    version: (version: string, date: string) => `Version ${version} · released ${date}`,
    build: 'build',
    noFirmware: 'No firmware is published yet.',
    notes: {
      NODEMCU: [
        'Analog input: A0 (one on the board).',
        'FLASH button (GPIO0): a short press flips the display pages, holding it 3 s opens the setup page.',
      ],
      D1_MINI: [
        'Analog input: A0 (one on the board).',
        'No FLASH button: to open the setup page, connect D3 (GPIO0) to GND for 3 s once it has started (during start this selects flashing).',
      ],
      ESP32_DEVKIT: [
        'Analog inputs: GPIO32–39 (ADC2 does not work together with Wi-Fi).',
        'BOOT button (GPIO0): a short press flips the display pages, holding it 3 s opens the setup page.',
      ],
    } as Record<BoardModelValue, string[]>,
    download: 'Download for USB install',
    install: 'Install from the browser',
    unsupported: 'Installing from the browser needs Chrome or Edge on a computer. Download the file and flash it with esptool instead.',
    notAllowed: 'Installing from the browser needs a secure (https) page.',
    flashAt: 'flash at 0x0',
    coming: 'Coming',
    howTitle: 'Flashing the downloaded file',
    how: [
      'Connect the board to the computer with a USB data cable.',
      'Install esptool (pip install esptool) or use the Espressif Flash Download Tool on Windows.',
      'Flash the full image at address 0x0: esptool.py write_flash 0x0 <file>.bin. If it does not connect, hold BOOT / FLASH while it starts.',
      'The board restarts and opens its setup Wi-Fi. Later updates come from the site.',
    ],
  },
};

type Texts = (typeof TEXTS)['uk'];

/**
 * The supported boards with the firmware for the first install over USB: the full image to download and
 * flash at 0x0, or installing it straight from the browser.
 */
export function FirmwareDownloads({ manifest }: { manifest?: FirmwareManifest }) {
  useWebTools();
  const t = useTexts(TEXTS);
  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-500">
        {manifest ? (
          <>
            {t.version(manifest.version, fromNow(manifest.date))}
            {manifest.commit && <> · {t.build} {manifest.commit}</>}
            {manifest.notes && <p className="mt-1 text-slate-700">{manifest.notes}</p>}
          </>
        ) : (
          t.noFirmware
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {BOARDS.map(board => (
          <BoardCard
            key={board.model}
            board={board}
            build={manifest?.builds.find(b => b.board === board.build)}
            t={t}
          />
        ))}
        {(manifest?.planned ?? []).map(planned => (
          <Card key={planned.board} className="flex flex-col gap-2 border-dashed text-slate-500">
            <div className="font-semibold">{planned.label}</div>
            <div className="text-sm">
              {t.coming}
              {planned.note ? `: ${planned.note}` : ''}.
            </div>
          </Card>
        ))}
      </div>
      <details className="text-sm text-slate-600">
        <summary className="cursor-pointer font-medium text-slate-900">{t.howTitle}</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {t.how.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </details>
    </div>
  );
}

function BoardCard({ board, build, t }: { board: Board; build?: FirmwareBuild; t: Texts }) {
  const base = `${window.location.origin}/firmware/`;
  // the application image is the download itself on boards without a separate full image
  const fullSha256 = build && (build.fullSha256 ?? (build.fullFile === build.file ? build.sha256 : undefined));
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-gray-50 p-1.5">
          <BoardArt board={board.model} className="h-20 w-24" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{board.label}</div>
          <div className="text-xs text-slate-500">
            {board.chip}
            {build && <> · {formatSize(build.fullSize ?? build.size)}</>}
          </div>
        </div>
      </div>

      <ul className="space-y-1 text-sm text-slate-600">
        {t.notes[board.model].map(note => (
          <li key={note}>{note}</li>
        ))}
      </ul>

      {build && (
        <>
          <a
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            href={base + build.fullFile}
            download
          >
            <Icon icon="lucide:download" className="size-4" />
            {t.download}
          </a>

          <esp-web-install-button manifest={base + build.install}>
            <button
              slot="activate"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-gray-50"
            >
              <Icon icon="lucide:usb" className="size-4" />
              {t.install}
            </button>
            <span slot="unsupported" className="text-xs text-slate-500">
              {t.unsupported}
            </span>
            <span slot="not-allowed" className="text-xs text-slate-500">
              {t.notAllowed}
            </span>
          </esp-web-install-button>

          <div className="flex flex-col gap-1 text-xs text-slate-500">
            <span>
              {build.fullFile} · {t.flashAt}
            </span>
            {fullSha256 && (
              <div className="truncate font-mono text-[11px] text-slate-400" title={fullSha256}>
                SHA-256 {fullSha256}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
