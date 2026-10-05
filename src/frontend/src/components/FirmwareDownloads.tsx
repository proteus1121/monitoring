import { Icon } from '@iconify/react';
import { ReactNode } from 'react';
import { Card } from '@src/components/Card';
import { BoardArt } from '@src/components/BoardArt';
import { UsbInstaller } from '@src/components/UsbInstaller';
import { fromNow } from '@src/lib/readings';
import { useTexts } from '@src/lib/lang';
import { FirmwareBuild, FirmwareManifest } from '@src/redux/controllersApi';
import { BoardModel } from '@src/redux/generatedApi';

const formatSize = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

type Board = {
  model: BoardModel;
  label: string;
  chip: string;
  // the firmware build (platformio env) the board runs
  build: string;
};

// the firmware cannot tell a NodeMCU from a D1 mini: both run the ESP8266 build
export const BOARDS: Board[] = [
  { model: 'NODEMCU', label: 'NodeMCU v2', chip: 'ESP8266', build: 'esp8266' },
  { model: 'D1_MINI', label: 'Wemos D1 mini', chip: 'ESP8266', build: 'esp8266' },
  { model: 'ESP32_DEVKIT', label: 'ESP32 DevKit', chip: 'ESP32', build: 'esp32dev' },
  { model: 'ESP32_CAM', label: 'AI-Thinker ESP32-CAM', chip: 'ESP32', build: 'esp32cam' },
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
      ESP32_CAM: [
        'Камера розпізнає полум’я на самій платі; трансляція — на сторінці «Камери».',
        'Вільні виводи: GPIO2, 4, 12–15 (аналогових немає). Кнопки BOOT немає: двічі натисніть RST протягом 5 с, щоб відкрити сторінку налаштування.',
        'Прошивається через USB-адаптер (ESP32-CAM-MB) або UART із GPIO0 на GND під час старту.',
      ],
    } as Record<BoardModel, string[]>,
    download: 'Завантажити для USB',
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
      ESP32_CAM: [
        'The camera detects flame on the board itself; watch it on the Cameras page.',
        'Free pins: GPIO2, 4, 12–15 (no analog ones). No BOOT button: press RST twice within 5 s to open the setup page.',
        'Flashed through a USB adapter (ESP32-CAM-MB) or a UART with GPIO0 to GND while it starts.',
      ],
    } as Record<BoardModel, string[]>,
    download: 'Download for USB install',
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
export function FirmwareDownloads({
  manifest,
  shown,
  about,
}: {
  manifest?: FirmwareManifest;
  // the boards to show (all by default), the rest is hidden by a search
  shown?: BoardModel[];
  // description and tags under the board name
  about?: (model: BoardModel) => ReactNode;
}) {
  const t = useTexts(TEXTS);
  const filtered = !!shown;
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
        {BOARDS.filter(board => !shown || shown.includes(board.model)).map(board => (
          <BoardCard
            key={board.model}
            board={board}
            build={manifest?.builds.find(b => b.board === board.build)}
            about={about?.(board.model)}
            t={t}
          />
        ))}
        {(filtered ? [] : manifest?.planned ?? []).map(planned => (
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

function BoardCard({
  board,
  build,
  about,
  t,
}: {
  board: Board;
  build?: FirmwareBuild;
  about?: ReactNode;
  t: Texts;
}) {
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

      {about}

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

          <UsbInstaller url={base + build.fullFile} chip={board.chip} />

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
