/// <reference types="w3c-web-serial" />
import { useState } from 'react';
import { Icon } from '@iconify/react';
import { ESPLoader, Transport } from 'esptool-js';
import { Spinner } from '@src/components/Spinner';
import { useTexts } from '@src/lib/lang';

// the ROM loader answers within a second; a board that stays silent this long will not
const CONNECT_TIMEOUT_MS = 20000;
const BAUDRATE = 115200;

const TEXTS = {
  uk: {
    install: 'Встановити з браузера',
    connecting: 'Підключення до плати…',
    writing: (percent: number) => `Запис ${percent}%`,
    done: 'Готово: плата перезапускається й відкриває свою Wi-Fi-мережу налаштування.',
    again: 'Встановити ще раз',
    unsupported:
      'Встановлення з браузера працює в Chrome або Edge на комп’ютері через захищену (https) сторінку. Завантажте файл і прошийте його через esptool.',
    portBusy:
      'Порт зайнятий іншою програмою (монітор порту, Arduino IDE, PlatformIO). Закрийте її й спробуйте ще раз.',
    noAnswer:
      'Плата не відповідає. Від’єднайте все від пінів RX / TX (D9 / D10), утримуйте FLASH / BOOT, натисніть і відпустіть RST, потім спробуйте ще раз.',
    wrongChip: (found: string, expected: string) => `Під’єднано ${found}, а ця прошивка для ${expected}.`,
    downloadFailed: 'Не вдалося завантажити файл прошивки із сайту.',
    failed: (message: string) => `Не вдалося прошити: ${message}`,
  },
  en: {
    install: 'Install from the browser',
    connecting: 'Connecting to the board…',
    writing: (percent: number) => `Writing ${percent}%`,
    done: 'Done: the board restarts and opens its setup Wi-Fi.',
    again: 'Install again',
    unsupported:
      'Installing from the browser needs Chrome or Edge on a computer and a secure (https) page. Download the file and flash it with esptool instead.',
    portBusy: 'The port is used by another program (a serial monitor, Arduino IDE, PlatformIO). Close it and try again.',
    noAnswer:
      'The board does not answer. Disconnect anything from the RX / TX pins (D9 / D10), hold FLASH / BOOT, press and release RST, then try again.',
    wrongChip: (found: string, expected: string) => `A ${found} is connected, this firmware is for ${expected}.`,
    downloadFailed: 'Could not download the firmware file from the site.',
    failed: (message: string) => `Flashing failed: ${message}`,
  },
};

type Phase = { kind: 'idle' } | { kind: 'connecting' } | { kind: 'writing'; percent: number } | { kind: 'done' } | { kind: 'error'; message: string };

class NoAnswer extends Error {}
class DownloadFailed extends Error {}
// the message is already for the user
class WrongChip extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new NoAnswer()), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// the browser has Web Serial (Chrome / Edge on a computer) and the page is https
const supported = () => typeof navigator !== 'undefined' && 'serial' in navigator && window.isSecureContext;

/**
 * Flashes the full image at 0x0 over Web Serial with esptool-js. Every failure ends in a message and the button
 * again, the port is always closed: a board that does not answer gives up after CONNECT_TIMEOUT_MS.
 */
export function UsbInstaller({ url, chip }: { url: string; chip: string }) {
  const t = useTexts(TEXTS);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  if (!supported()) {
    return <p className="text-xs text-slate-500">{t.unsupported}</p>;
  }

  const install = async () => {
    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch {
      // the port chooser was closed
      return;
    }
    const transport = new Transport(port, false);
    setPhase({ kind: 'connecting' });
    try {
      const image = fetch(url).then(async res => {
        if (!res.ok) throw new DownloadFailed();
        return new Uint8Array(await res.arrayBuffer());
      });
      // no output wanted: the steps are shown on the button
      const terminal = { clean() {}, writeLine() {}, write() {} };
      const loader = new ESPLoader({ transport, baudrate: BAUDRATE, romBaudrate: BAUDRATE, terminal });
      const found = await withTimeout(loader.main(), CONNECT_TIMEOUT_MS);
      if (!found.toUpperCase().replace(/[^A-Z0-9]/g, '').startsWith(chip.toUpperCase())) {
        throw new WrongChip(t.wrongChip(found, chip));
      }
      const data = await image;
      setPhase({ kind: 'writing', percent: 0 });
      await loader.writeFlash({
        fileArray: [{ data, address: 0 }],
        flashMode: 'keep',
        flashFreq: 'keep',
        flashSize: 'keep',
        eraseAll: false,
        compress: true,
        reportProgress: (_, written, total) =>
          setPhase({ kind: 'writing', percent: Math.round((written * 100) / Math.max(total, 1)) }),
      });
      await loader.after('hard_reset');
      setPhase({ kind: 'done' });
    } catch (error) {
      setPhase({ kind: 'error', message: explain(error, t) });
    } finally {
      await transport.disconnect().catch(() => undefined);
    }
  };

  const busy = phase.kind === 'connecting' || phase.kind === 'writing';
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={install}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-black/15 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-gray-50 disabled:opacity-70"
      >
        {busy ? <Spinner /> : <Icon icon="lucide:usb" className="size-4" />}
        {phase.kind === 'connecting'
          ? t.connecting
          : phase.kind === 'writing'
            ? t.writing(phase.percent)
            : phase.kind === 'done' || phase.kind === 'error'
              ? t.again
              : t.install}
      </button>
      {phase.kind === 'writing' && (
        <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
          <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${phase.percent}%` }} />
        </div>
      )}
      {phase.kind === 'done' && <p className="text-xs text-green-700">{t.done}</p>}
      {phase.kind === 'error' && <p className="text-xs text-red-600">{phase.message}</p>}
    </div>
  );
}

function explain(error: unknown, t: (typeof TEXTS)['en']) {
  if (error instanceof NoAnswer) return t.noAnswer;
  if (error instanceof DownloadFailed) return t.downloadFailed;
  if (error instanceof WrongChip) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  // Web Serial: "Failed to open serial port." when another program holds it
  if ((error instanceof DOMException && error.name === 'NetworkError') || /open serial port/i.test(message)) {
    return t.portBusy;
  }
  // esptool-js gives up after its own connection attempts
  if (/connect|sync|timeout/i.test(message)) return t.noAnswer;
  return t.failed(message);
}
