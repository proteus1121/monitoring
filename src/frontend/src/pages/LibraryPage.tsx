import { Card } from '@src/components/Card';
import { Loader } from '@src/components/Loader';
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from '@src/components/PageHeader';
import { PageLayout } from '@src/layouts/PageLayout';
import { DEVICE_TYPE_LABELS } from '@src/lib/hardware';
import { useGetSensorModelsQuery } from '@src/redux/generatedApi';
import { useGetDisplayModelsQuery, useGetFirmwareManifestQuery } from '@src/redux/controllersApi';
import { ModuleArt } from '@src/components/ModuleArt';
import { FirmwareDownloads } from '@src/components/FirmwareDownloads';
import { useTexts } from '@src/lib/lang';

const TEXTS = {
  uk: {
    title: 'Бібліотека',
    description:
      'Усе, що підтримують плати: прошивка, яку один раз записують на нову плату через USB, і модулі, якими вона керує. Під’єднайте модуль і додайте його на сторінці «Мої пристрої». Більше нічого прошивати не треба, подальші оновлення приходять із сайту.',
    boards: 'Плати й прошивка',
    boardsNote: 'Одна прошивка для всіх плат.',
    modules: 'Модулі: датчики й виходи',
    analog: 'аналоговий',
    output: 'вихід',
    displays: 'Дисплеї',
    displaysNote: 'Задається на картці плати на сторінці «Мої пристрої». Усі дисплеї показують ті самі екрани.',
  },
  en: {
    title: 'Library',
    description:
      'Everything available for the boards: the firmware to flash to a new board over USB once, and the modules it drives. Wire one and add it on the My devices page. Nothing else has to be flashed, later updates come from the site.',
    boards: 'Boards and firmware',
    boardsNote: 'One firmware for every board.',
    modules: 'Modules: sensors and outputs',
    analog: 'analog',
    output: 'output',
    displays: 'Displays',
    displaysNote: 'Set on the board card of the My devices page. Every display shows the same screens.',
  },
};

function Pins({ pins }: { pins: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {pins.map(pin => (
        <span key={pin} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
          {pin}
        </span>
      ))}
    </div>
  );
}

function Tag({ children, className }: { children: string; className: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs ${className}`}>{children}</span>;
}

/**
 * What to start with: the supported boards with the firmware to flash over USB once, then everything they can
 * drive (read from the server so the list always matches it).
 */
export function LibraryPage() {
  const { data: manifest, isLoading: manifestLoading } = useGetFirmwareManifestQuery();
  const { data: sensors, isLoading: sensorsLoading } = useGetSensorModelsQuery();
  const { data: displays, isLoading: displaysLoading } = useGetDisplayModelsQuery();
  const t = useTexts(TEXTS);

  if (manifestLoading || sensorsLoading || displaysLoading) {
    return <Loader />;
  }

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>{t.title}</PageHeaderTitle>
          <PageHeaderDescription>{t.description}</PageHeaderDescription>
        </div>
      </PageHeader>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">{t.boards}</h2>
          <p className="text-sm text-slate-500">{t.boardsNote}</p>
        </div>
        <FirmwareDownloads manifest={manifest} />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">{t.modules}</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(sensors ?? []).map(sensor => (
            <Card key={sensor.model} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-lg bg-gray-50 p-1.5">
                  <ModuleArt module={sensor.model} className="h-20 w-24" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{sensor.label}</div>
                  <div className="text-sm text-slate-500">{sensor.description}</div>
                </div>
                <div className="flex gap-1">
                  {sensor.analog && <Tag className="bg-purple-50 text-purple-700">{t.analog}</Tag>}
                  {sensor.output && <Tag className="bg-amber-50 text-amber-800">{t.output}</Tag>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <div className="flex flex-wrap gap-1">
                  {(sensor.supportedTypes ?? []).map(type => (
                    <Tag key={type} className="bg-blue-50 text-blue-800">
                      {DEVICE_TYPE_LABELS[type]}
                    </Tag>
                  ))}
                </div>
                <Pins pins={sensor.pins ?? []} />
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="font-semibold">{t.displays}</h2>
          <p className="text-sm text-slate-500">{t.displaysNote}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(displays ?? [])
            .filter(display => display.model !== 'NONE')
            .map(display => (
              <Card key={display.model} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-lg bg-gray-50 p-1.5">
                    <ModuleArt module={display.model} className="h-20 w-24" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{display.label}</div>
                    <div className="text-sm text-slate-500">{display.description}</div>
                  </div>
                  {display.bus && <Tag className="bg-gray-100 text-slate-700">{display.bus}</Tag>}
                </div>
                <Pins pins={display.pins} />
              </Card>
            ))}
        </div>
      </section>
    </PageLayout>
  );
}
