/// <reference types="w3c-web-serial" />
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import { serialSupported } from '@src/components/UsbInstaller';
import { Controller } from '@src/redux/generatedApi';
import { useTexts } from '@src/lib/lang';

// the firmware's Serial.begin
const BAUDRATE = 115200;
// keep the tail of a long session, the browser slows down on megabytes of text
const MAX_CHARS = 200_000;

const TEXTS = {
  uk: {
    title: 'Логи плати',
    note: 'через USB, з цього комп’ютера',
    connect: 'Під’єднати через USB',
    connecting: 'Підключення…',
    hint: 'Під’єднайте плату кабелем USB до цього комп’ютера й виберіть її порт. Під час підключення плата може перезапуститися.',
    unsupported:
      'Логи через USB відкриваються в Chrome або Edge на комп’ютері через захищену (https) сторінку.',
    portBusy:
      'Порт зайнятий іншою програмою (монітор порту, Arduino IDE, PlatformIO). Закрийте її й спробуйте ще раз.',
    lost: 'Плату від’єднано.',
    failed: (message: string) => `Не вдалося відкрити порт: ${message}`,
    empty: 'Очікування виводу плати…',
    reset: 'Перезапустити плату',
    clear: 'Очистити',
    download: 'Завантажити лог',
    disconnect: 'Від’єднати',
    follow: 'Прокручувати до кінця',
    close: 'Закрити',
  },
  en: {
    title: 'Board logs',
    note: 'over USB, from this computer',
    connect: 'Connect over USB',
    connecting: 'Connecting…',
    hint: 'Plug the board into this computer with a USB cable and choose its port. The board may restart when it is connected.',
    unsupported: 'Logs over USB open in Chrome or Edge on a computer and on a secure (https) page.',
    portBusy: 'The port is used by another program (a serial monitor, Arduino IDE, PlatformIO). Close it and try again.',
    lost: 'The board was disconnected.',
    failed: (message: string) => `Could not open the port: ${message}`,
    empty: 'Waiting for the board output…',
    reset: 'Restart the board',
    clear: 'Clear',
    download: 'Download log',
    disconnect: 'Disconnect',
    follow: 'Follow the end',
    close: 'Close',
  },
};

type Phase = { kind: 'idle' } | { kind: 'connecting' } | { kind: 'open' } | { kind: 'error'; message: string };

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * The serial log of a board plugged into this computer, read with Web Serial: what the console of ESP Web Tools
 * showed in the Library before. The port is closed when the panel is.
 */
export function SerialLogPanel(props: { controller: Controller; onClose: () => void }) {
  const t = useTexts(TEXTS);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [log, setLog] = useState('');
  const [follow, setFollow] = useState(true);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  // set when the user disconnects: the read loop then ends quietly
  const closingRef = useRef(false);
  const boxRef = useRef<HTMLPreElement>(null);

  const append = (text: string) =>
    setLog(prev => {
      const next = prev + text;
      return next.length > MAX_CHARS ? next.slice(next.length - MAX_CHARS) : next;
    });

  const read = async (port: SerialPort) => {
    const decoder = new TextDecoder();
    while (port.readable && !closingRef.current) {
      const reader = port.readable.getReader();
      readerRef.current = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) append(decoder.decode(value, { stream: true }).replace(/\r/g, ''));
        }
      } catch (error) {
        // a framing or buffer error keeps the port readable and the loop goes on; an unplugged board does not
        if (!port.readable && !closingRef.current) {
          setPhase({ kind: 'error', message: t.lost });
        }
        if (!(error instanceof DOMException) || error.name === 'NetworkError') break;
      } finally {
        reader.releaseLock();
        readerRef.current = null;
      }
    }
  };

  const close = async () => {
    closingRef.current = true;
    await readerRef.current?.cancel().catch(() => undefined);
    const port = portRef.current;
    portRef.current = null;
    // the read loop releases the reader, then the port closes
    for (let i = 0; i < 20 && port?.readable?.locked; i++) await pause(50);
    await port?.close().catch(() => undefined);
  };

  const connect = async () => {
    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch {
      // the port chooser was closed
      return;
    }
    setPhase({ kind: 'connecting' });
    try {
      await port.open({ baudRate: BAUDRATE, bufferSize: 64 * 1024 });
    } catch (error) {
      setPhase({ kind: 'error', message: explain(error, t) });
      return;
    }
    closingRef.current = false;
    portRef.current = port;
    // DTR and RTS low: EN and GPIO0 high, the board runs its firmware rather than the ROM loader
    await port.setSignals({ dataTerminalReady: false, requestToSend: false }).catch(() => undefined);
    setPhase({ kind: 'open' });
    read(port).then(() => {
      if (portRef.current === port && !closingRef.current) {
        portRef.current = null;
        port.close().catch(() => undefined);
      }
    });
  };

  const disconnect = async () => {
    await close();
    setPhase({ kind: 'idle' });
  };

  // RTS pulls EN low on the boards' auto-reset circuit, with DTR low GPIO0 stays high: a normal boot
  const reset = async () => {
    const port = portRef.current;
    if (!port) return;
    await port.setSignals({ dataTerminalReady: false, requestToSend: true });
    await pause(100);
    await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([log], { type: 'text/plain' }));
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
    link.href = url;
    link.download = `${props.controller.name || props.controller.hardwareId || 'board'}-${stamp}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // the port is released when the panel closes or the page is left
  useEffect(() => () => void close(), []);

  useEffect(() => {
    if (follow && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [log, follow]);

  const open = phase.kind === 'open';

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Icon icon="lucide:terminal" className="size-4 text-slate-600" />
        <span className="font-medium">{t.title}</span>
        <span className="text-xs text-slate-500">{t.note}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {open && (
            <>
              <label className="mr-2 flex items-center gap-1 text-xs text-slate-600">
                <input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} />
                {t.follow}
              </label>
              <Button size="icon" variant="ghost" title={t.reset} onClick={reset}>
                <Icon icon="lucide:rotate-ccw" />
              </Button>
            </>
          )}
          {log && (
            <>
              <Button size="icon" variant="ghost" title={t.download} onClick={download}>
                <Icon icon="lucide:download" />
              </Button>
              <Button size="icon" variant="ghost" title={t.clear} onClick={() => setLog('')}>
                <Icon icon="lucide:eraser" />
              </Button>
            </>
          )}
          {open && (
            <Button size="sm" variant="ghost" onClick={disconnect}>
              <Icon icon="lucide:unplug" />
              {t.disconnect}
            </Button>
          )}
          <Button size="icon" variant="ghost" title={t.close} onClick={props.onClose}>
            <Icon icon="lucide:x" />
          </Button>
        </div>
      </div>

      {!serialSupported() ? (
        <p className="text-slate-600">{t.unsupported}</p>
      ) : (
        !open && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-slate-600">{t.hint}</p>
            <Button size="sm" variant="secondary" disabled={phase.kind === 'connecting'} onClick={connect}>
              {phase.kind === 'connecting' ? <Spinner /> : <Icon icon="lucide:usb" />}
              {phase.kind === 'connecting' ? t.connecting : t.connect}
            </Button>
            {phase.kind === 'error' && <p className="text-xs text-red-600">{phase.message}</p>}
          </div>
        )
      )}

      {(open || log) && (
        <pre
          ref={boxRef}
          className="mt-2 h-80 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-all text-slate-100"
        >
          {log || <span className="text-slate-400">{t.empty}</span>}
        </pre>
      )}
    </div>
  );
}

function explain(error: unknown, t: (typeof TEXTS)['en']) {
  const message = error instanceof Error ? error.message : String(error);
  // Web Serial: "Failed to open serial port." when another program holds it
  if ((error instanceof DOMException && error.name === 'NetworkError') || /open serial port/i.test(message)) {
    return t.portBusy;
  }
  return t.failed(message);
}
