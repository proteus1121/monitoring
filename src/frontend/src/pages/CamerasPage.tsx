import { Icon } from '@iconify/react';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@src/components/Button';
import { Card } from '@src/components/Card';
import { Loader } from '@src/components/Loader';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { useTexts } from '@src/lib/lang';
import { Camera, CameraVision, useGetCamerasQuery } from '@src/redux/generatedApi';

const apiBaseURL = process.env.BASE_URL!;

const TEXTS = {
  uk: {
    title: 'Камери',
    description:
      'Живе відео з плат ESP32-CAM. Полум’я шукає сама плата, безперервно, навіть коли сторінку закрито: тривога приходить як від датчика полум’я, а тут видно, що бачить детектор. Відео йде, лише поки сторінка відкрита, і не записується.',
    noCameras: 'Камер ще немає. Прошийте ESP32-CAM збіркою esp32cam (сторінка «Бібліотека») і під’єднайте її, як звичайну плату.',
    library: 'Бібліотека',
    online: 'ОНЛАЙН',
    offline: 'ОФЛАЙН',
    monitoring: 'Спостереження',
    confirming: (n: number, of: number) => `Підтвердження ${n}/${of}`,
    flame: 'ПОЛУМ’Я',
    candidate: (n: number, of: number) => `кандидат ${n}/${of}`,
    waiting: 'Чекаємо на кадри…',
    offlineNote: 'Плата не на зв’язку.',
    noCamera: 'Камера на платі не запустилася: перевірте шлейф камери.',
    ratio: 'Частка «вогняних» пікселів',
    flicker: 'Мерехтіння (дисперсія)',
    confirmations: 'Підтвердження',
    rate: 'Аналіз / відео',
    fps: (analysed: number, camera: number) => `${analysed.toFixed(1)} / ${camera.toFixed(1)} к/с`,
    fullscreen: 'На весь екран',
    snapshot: 'Зберегти кадр',
    reconnect: 'Перепідключити',
    alerts: 'Сповіщення про полум’я',
    noDevice: 'Датчик полум’я камери видалено: додайте модуль «ESP32-CAM camera» на сторінці «Мої пристрої», щоб отримувати сповіщення.',
    note: 'Пороги детектора — зі статті: яскравість ≥ 180, насиченість ≥ 80, червоний над синім ≥ 30; частка ≥ 0,004, дисперсія за 8 кадрів ≥ 5·10⁻⁶, 3 підтвердження; тривога тримається ще 3 с.',
  },
  en: {
    title: 'Cameras',
    description:
      'Live video of ESP32-CAM boards. The board looks for flame itself, all the time, also with this page closed: the alarm comes like one of a flame sensor, here you see what the detector sees. Video flows only while the page is open and is not recorded.',
    noCameras: 'No cameras yet. Flash an ESP32-CAM with the esp32cam build (Library page) and connect it like any other board.',
    library: 'Library',
    online: 'ONLINE',
    offline: 'OFFLINE',
    monitoring: 'Monitoring',
    confirming: (n: number, of: number) => `Confirming ${n}/${of}`,
    flame: 'FLAME',
    candidate: (n: number, of: number) => `candidate ${n}/${of}`,
    waiting: 'Waiting for frames…',
    offlineNote: 'The board is offline.',
    noCamera: 'The camera did not start on the board: check its ribbon cable.',
    ratio: 'Flame-coloured pixels',
    flicker: 'Flicker (variance)',
    confirmations: 'Confirmations',
    rate: 'Analysis / video',
    fps: (analysed: number, camera: number) => `${analysed.toFixed(1)} / ${camera.toFixed(1)} fps`,
    fullscreen: 'Full screen',
    snapshot: 'Save frame',
    reconnect: 'Reconnect',
    alerts: 'Flame alerts',
    noDevice: 'The camera’s flame device was deleted: add the “ESP32-CAM camera” module on the My devices page to get alerts.',
    note: 'Detector thresholds from the paper: brightness ≥ 180, saturation ≥ 80, red over blue ≥ 30; share ≥ 0.004, variance over 8 frames ≥ 5·10⁻⁶, 3 confirmations; the alarm is held 3 s more.',
  },
};

type Texts = (typeof TEXTS)['uk'];

// thresholds of the firmware (camera/Camera.cpp), for the bars
const TAU_RATIO = 0.004;
const TAU_FLICKER = 5e-6;

/**
 * Live view of the ESP32-CAM boards with what their flame detector sees.
 */
export function CamerasPage() {
  const t = useTexts(TEXTS);
  // the detector's result comes with the frames, about once a second is enough for the overlay
  const { data: cameras, isLoading } = useGetCamerasQuery(undefined, { pollingInterval: 1000 });

  if (isLoading) return <Loader />;

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>{t.title}</PageHeaderTitle>
          <PageHeaderDescription>{t.description}</PageHeaderDescription>
        </div>
      </PageHeader>

      {!cameras?.length ? (
        <Card className="text-sm text-slate-500">
          {t.noCameras}{' '}
          <Link to="/settings/library" className="underline">
            {t.library}
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {cameras.map(camera => (
            <CameraCard key={camera.controllerId} camera={camera} t={t} />
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">{t.note}</p>
    </PageLayout>
  );
}

function CameraCard({ camera, t }: { camera: Camera; t: Texts }) {
  const stage = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const vision = camera.vision;
  // a result older than this is from before the page was opened
  const fresh = !!vision && Date.now() - new Date(vision.received).getTime() < 10000;

  // the server ends a stream after 30 s without frames: connect again when the board comes back
  useEffect(() => {
    if (camera.online) {
      setFailed(false);
      setAttempt(a => a + 1);
    }
  }, [camera.online]);

  const src = `${apiBaseURL}/cameras/${camera.controllerId}/stream?n=${attempt}`;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Icon icon="lucide:cctv" className="size-5 text-slate-500" />
        <span className="font-semibold">{camera.name}</span>
        <span
          className={`rounded-full px-2 text-xs text-white ${camera.online ? 'bg-green-500' : 'bg-gray-500'}`}
        >
          {camera.online ? t.online : t.offline}
        </span>
        <span className="ml-auto">
          <StatePill vision={fresh ? vision : undefined} t={t} />
        </span>
      </div>

      <div
        ref={stage}
        className="relative overflow-hidden rounded-lg bg-black"
        style={{ aspectRatio: vision?.width && vision.height ? `${vision.width} / ${vision.height}` : '4 / 3' }}
      >
        {camera.online && !failed && (
          <img
            key={attempt}
            src={src}
            alt={camera.name}
            className="absolute inset-0 h-full w-full object-contain"
            onError={() => {
              setFailed(true);
              // the board may be just starting: try again a bit later
              setTimeout(() => {
                setFailed(false);
                setAttempt(a => a + 1);
              }, 3000);
            }}
          />
        )}
        {fresh && <Overlay vision={vision!} t={t} />}
        {(!camera.online || camera.cameraFound === false || !fresh) && (
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm text-white">
            {!camera.online ? t.offlineNote : camera.cameraFound === false ? t.noCamera : t.waiting}
          </div>
        )}
      </div>

      {fresh && <Stats vision={vision!} t={t} />}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => stage.current?.requestFullscreen?.()}>
          <Icon icon="lucide:maximize" className="size-4" />
          {t.fullscreen}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const link = document.createElement('a');
            link.href = `${apiBaseURL}/cameras/${camera.controllerId}/snapshot?t=${Date.now()}`;
            link.download = `${camera.name}-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
            link.click();
          }}
        >
          <Icon icon="lucide:camera" className="size-4" />
          {t.snapshot}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setAttempt(a => a + 1)}>
          <Icon icon="lucide:refresh-cw" className="size-4" />
          {t.reconnect}
        </Button>
        {camera.flameDeviceId ? (
          <Link to="/settings/alerts" className="ml-auto text-sm text-blue-700 underline">
            {t.alerts}
          </Link>
        ) : null}
      </div>
      {!camera.flameDeviceId && <p className="text-xs text-amber-700">{t.noDevice}</p>}
    </Card>
  );
}

function StatePill({ vision, t }: { vision?: CameraVision; t: Texts }) {
  if (!vision) return null;
  const [label, style] = vision.alarm
    ? [t.flame, 'bg-red-100 text-red-700']
    : vision.consec > 0
      ? [t.confirming(vision.consec, vision.confirm), 'bg-amber-100 text-amber-800']
      : [t.monitoring, 'bg-green-100 text-green-700'];
  return (
    <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', style)}>
      {vision.alarm && <Icon icon="lucide:flame" className="mr-1 inline size-3.5" />}
      {label}
    </span>
  );
}

/**
 * The box around the flame-coloured pixels, in the coordinates of the analysed frame: the image keeps the
 * frame's aspect ratio, so percentages of the stage fit.
 */
function Overlay({ vision, t }: { vision: CameraVision; t: Texts }) {
  const box = vision.box;
  if (!box || box.length !== 4 || !vision.width || !vision.height) return null;
  const [x1, y1, x2, y2] = box;
  const color = vision.alarm ? '#ef4444' : '#f59e0b';
  return (
    <div
      className="pointer-events-none absolute border-2"
      style={{
        left: `${(x1 / vision.width) * 100}%`,
        top: `${(y1 / vision.height) * 100}%`,
        width: `${((x2 - x1 + 1) / vision.width) * 100}%`,
        height: `${((y2 - y1 + 1) / vision.height) * 100}%`,
        borderColor: color,
      }}
    >
      <span
        className="absolute -top-5 left-0 rounded px-1 text-[11px] font-semibold whitespace-nowrap text-white"
        style={{ background: color }}
      >
        {vision.alarm ? t.flame : t.candidate(vision.consec, vision.confirm)}
      </span>
    </div>
  );
}

function Stats({ vision, t }: { vision: CameraVision; t: Texts }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label={t.ratio} value={vision.ratio.toFixed(4)} share={vision.ratio / TAU_RATIO / 2} over={vision.ratio >= TAU_RATIO} />
      <Stat
        label={t.flicker}
        value={vision.variance.toExponential(1)}
        share={vision.variance / TAU_FLICKER / 2}
        over={vision.variance >= TAU_FLICKER}
      />
      <Stat
        label={t.confirmations}
        value={`${vision.consec} / ${vision.confirm}`}
        share={vision.confirm ? vision.consec / vision.confirm : 0}
        over={vision.alarm}
      />
      <Stat label={t.rate} value={t.fps(vision.fps, vision.cameraFps)} />
    </div>
  );
}

// `share` fills the bar (the threshold is at half of it for the ratio and the variance)
function Stat({ label, value, share, over }: { label: string; value: string; share?: number; over?: boolean }) {
  return (
    <div className="rounded-lg border border-black/10 px-3 py-2">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-mono text-sm tabular-nums">{value}</div>
      {share !== undefined && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={clsx('h-full rounded-full', over ? 'bg-red-500' : 'bg-blue-500')}
            style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
