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
import { useGetDisplayModelsQuery } from '@src/redux/controllersApi';
import { ModuleArt } from '@src/components/ModuleArt';

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
 * Everything the firmware can drive, read from the server so the list always matches it.
 */
export function ModulesPage() {
  const { data: sensors, isLoading: sensorsLoading } = useGetSensorModelsQuery();
  const { data: displays, isLoading: displaysLoading } = useGetDisplayModelsQuery();

  if (sensorsLoading || displaysLoading) {
    return <Loader />;
  }

  return (
    <PageLayout className="space-y-6">
      <PageHeader className="pb-0">
        <div>
          <PageHeaderTitle>Supported modules</PageHeaderTitle>
          <PageHeaderDescription>
            Modules the board firmware drives. Wire one to an ESP32 or ESP8266 and choose it on the Devices
            page, nothing has to be flashed.
          </PageHeaderDescription>
        </div>
      </PageHeader>

      <section className="space-y-3">
        <h2 className="font-semibold">Sensors and outputs</h2>
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
                  {sensor.analog && <Tag className="bg-purple-50 text-purple-700">analog</Tag>}
                  {sensor.output && <Tag className="bg-amber-50 text-amber-800">output</Tag>}
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
          <h2 className="font-semibold">Displays</h2>
          <p className="text-sm text-slate-500">
            Set on the board card of the Devices page. Every display shows the same screens.
          </p>
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

      <Card className="text-sm text-slate-600">
        <div className="mb-1 font-semibold text-slate-900">Boards</div>
        ESP32 DevKit and NodeMCU v2 (ESP8266) with the same firmware. Analog modules need an ADC pin: GPIO32-39
        on ESP32, A0 on ESP8266. GPIO0 is the BOOT / FLASH button: a short press flips the display pages,
        holding it 3 s opens the setup page.
      </Card>
    </PageLayout>
  );
}
