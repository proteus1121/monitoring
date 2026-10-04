import { useState } from 'react';
import clsx from 'clsx';
import z from 'zod';
import { notification } from 'antd';
import { Icon } from '@iconify/react';
import { FieldGroup } from '@src/components/Field';
import { Button } from '@src/components/Button';
import { Spinner } from '@src/components/Spinner';
import { DeviceType } from '@src/lib/api/api.types';
import {
  DEVICE_TYPE_LABELS,
  controllerPlatform,
  getPinOptions,
} from '@src/lib/hardware';
import { fromNow } from '@src/lib/readings';
import { pick, useTexts } from '@src/lib/lang';
import {
  Device,
  DeviceRequest,
  DeviceTypeValue,
  ForecastModel,
  SensorModel,
  useGetControllersQuery,
  useGetSensorModelsQuery,
  usePredictMetricsMutation,
  useGetLlmStatusQuery,
  useDescribeDeviceMutation,
} from '../generatedApi';
import { useGetRawReadingQuery, type ControllerWithRole } from '../controllersApi';

// value of the controller select when the device is not wired to a board
export const NO_CONTROLLER = 'none';

const TEXTS = {
  uk: {
    mustBeNumber: 'Має бути числом',
    atLeastSecond: 'Щонайменше 1 секунда',
    selectModule: 'Виберіть модуль, під’єднаний до плати',
    selectPin: 'Виберіть пін',
    forecastModels: {
      NONE: ['Без прогнозу', 'Для пристрою не будується прогноз.'],
      ARIMA: ['ARIMA', 'Авторегресійна інтегрована модель ковзного середнього ARIMA(p, d, q). Добре для плавних рядів із трендом.'],
      KALMAN: ['Фільтр Калмана', 'Локальний рівень і згасаючий тренд, які відстежує фільтр Калмана. Стійкий до шумних датчиків, швидко підлаштовується.'],
      XGBOOST: ['XGBoost', 'Градієнтний бустинг дерев за часом доби, днем тижня й останніми значеннями. Враховує добові закономірності.'],
    } as Record<string, [string, string]>,
    fields: {
      name: 'Назва пристрою',
      description: 'Опис',
      criticalValue: 'Верхній поріг',
      lowerValue: 'Нижній поріг',
      delaySeconds: 'Інтервал надсилання',
      type: 'Вимірювання',
      controllerId: 'Плата',
      sensorModel: 'Модуль датчика',
      pin: 'Пін',
      secondaryPin: 'Другий пін',
    } as Record<string, string>,
    checkSettings: 'Перевірте налаштування пристрою',
    tabs: { general: 'Загальне', alerts: 'Сповіщення', forecast: 'Прогноз', calibration: 'Калібрування' },
    namePlaceholder: 'Температура на кухні',
    descriptionPlaceholder: 'Де стоїть і що вимірює',
    board: 'Плата',
    notWired: 'Не під’єднано до плати',
    sensorModule: 'Модуль датчика',
    selectModulePlaceholder: 'Виберіть модуль',
    noBoards: 'Плат ще немає. Прошийте плату й увійдіть з її сторінки.',
    signal: 'Сигнал',
    pinOf: (name: string) => `Пін ${name}`,
    selectPinPlaceholder: 'Виберіть пін',
    measurement: 'Вимірювання',
    selectMeasurement: 'Виберіть вимірювання',
    interval: 'Інтервал надсилання, секунд',
    intervalNote: 'Як часто плата надсилає значення. Після трьох пропущених інтервалів пристрій вважається офлайн.',
    sensor: 'Датчик',
    describeFailed: 'Не вдалося згенерувати опис',
    generate: 'Згенерувати',
    generateNote: 'Пише AI за назвою, модулем і піном. Якщо залишити порожнім, опис з’явиться після збереження.',
    calibrationHelp: (
      <>
        Тримайте датчик у повітрі й натисніть <b>Сухо зараз</b>; занурте його у воду до риски, дочекайтеся, поки
        значення встановиться, і натисніть <b>У воді зараз</b>. Збережіть, щоб надіслати на плату.
      </>
    ),
    rawNow: 'Сире значення зараз:',
    rawSent: (when: string) => `${when}, плата надсилає його з кожним показником`,
    rawNone: 'ще немає: плата надішле його з наступним показником',
    dry: 'Сухо, 0 %',
    wet: 'У воді, 100 %',
    byDefault: 'типово',
    dryNow: 'Сухо зараз',
    wetNow: 'У воді зараз',
    preview: (value: number) => (
      <>
        З цими значеннями датчик зараз показує <b>{value} %</b>.
      </>
    ),
    mustDiffer: 'Значення «сухо» й «у воді» мають відрізнятися.',
    alertsHelp:
      'Сповіщення спрацьовує, коли значення виходить вище верхнього або нижче нижнього порогу. Залиште порожнім, щоб вимкнути. Канали сповіщень налаштовуються на сторінці «Сповіщення».',
    upper: 'Верхній поріг',
    lower: 'Нижній поріг',
    notSet: 'не задано',
    forecastFailed: 'Не вдалося побудувати прогноз',
    forecastNotBuilt: 'Прогноз не побудовано',
    forecastBuilt: (hours: number) => `Прогноз побудовано: на ${hours} год уперед`,
    trainedOn: (hours: number, mae?: string, rmse?: string) => `Навчено на ${hours} год. MAE ${mae}, RMSE ${rmse}`,
    model: 'Модель',
    horizon: 'Горизонт, годин',
    history: 'Історія, днів',
    arimaP: 'p (порядок AR)',
    arimaD: 'd (диференціювання)',
    arimaQ: 'q (порядок MA)',
    processNoise: 'Шум процесу',
    measurementNoise: 'Шум вимірювань',
    kalmanNote:
      'Відносно дисперсії погодинних змін. Більший шум процесу швидше йде за даними, більший шум вимірювань сильніше згладжує.',
    rounds: 'Раунди бустингу',
    depth: 'Макс. глибина дерева',
    lastRun: (when: string) => `Останній запуск ${when}`,
    notRun: 'Ще не запускався. Прогнози оновлюються щогодини.',
    runNow: 'Запустити зараз',
    runNote:
      '«Запустити зараз» бере збережені налаштування, тож спершу збережіть зміни. Похибки рахуються на останніх годинах, яких модель не бачила.',
  },
  en: {
    mustBeNumber: 'Must be a number',
    atLeastSecond: 'At least 1 second',
    selectModule: 'Select the module wired to the controller',
    selectPin: 'Select the pin',
    forecastModels: {
      NONE: ['No forecast', 'The device is not forecast.'],
      ARIMA: ['ARIMA', 'Autoregressive integrated moving average ARIMA(p, d, q). Good for smooth series with a trend.'],
      KALMAN: ['Kalman filter', 'Local level + damped trend tracked by a Kalman filter. Robust to noisy sensors, adapts quickly.'],
      XGBOOST: ['XGBoost', 'Gradient boosted trees on the time of day, day of week and recent values. Captures daily patterns.'],
    } as Record<string, [string, string]>,
    fields: {
      name: 'Device name',
      description: 'Description',
      criticalValue: 'Upper threshold',
      lowerValue: 'Lower threshold',
      delaySeconds: 'Send interval',
      type: 'Measurement',
      controllerId: 'Board',
      sensorModel: 'Sensor module',
      pin: 'Pin',
      secondaryPin: 'Second pin',
    } as Record<string, string>,
    checkSettings: 'Check the device settings',
    tabs: { general: 'General', alerts: 'Alerts', forecast: 'Forecast', calibration: 'Calibration' },
    namePlaceholder: 'Kitchen temperature',
    descriptionPlaceholder: 'Where it is, what it measures',
    board: 'Board',
    notWired: 'Not wired to a board',
    sensorModule: 'Sensor module',
    selectModulePlaceholder: 'Select module',
    noBoards: 'No boards yet. Flash a board and sign in from its page.',
    signal: 'Signal',
    pinOf: (name: string) => `${name} pin`,
    selectPinPlaceholder: 'Select pin',
    measurement: 'Measurement',
    selectMeasurement: 'Select measurement',
    interval: 'Send interval, seconds',
    intervalNote: 'How often the board sends the value. The device is shown offline after three missed intervals.',
    sensor: 'Sensor',
    describeFailed: 'Could not generate a description',
    generate: 'Generate',
    generateNote: 'Written by AI from the name, module and pin. Left empty, it is generated after saving.',
    calibrationHelp: (
      <>
        Hold the probe in the air, press <b>Dry now</b>; put it in water up to the line, wait for the value to
        settle and press <b>In water now</b>. Save to send it to the board.
      </>
    ),
    rawNow: 'Raw value now:',
    rawSent: (when: string) => `${when}, the board sends it with every reading`,
    rawNone: 'none yet: the board sends it with the next reading',
    dry: 'Dry, 0 %',
    wet: 'In water, 100 %',
    byDefault: 'default',
    dryNow: 'Dry now',
    wetNow: 'In water now',
    preview: (value: number) => (
      <>
        With these values the probe reads <b>{value} %</b> now.
      </>
    ),
    mustDiffer: 'Dry and wet must differ.',
    alertsHelp:
      'An alert is raised when a value goes above the upper or below the lower threshold. Leave empty to disable. Notification channels are set on the Alerts page.',
    upper: 'Upper threshold',
    lower: 'Lower threshold',
    notSet: 'not set',
    forecastFailed: 'Forecast failed',
    forecastNotBuilt: 'Forecast was not built',
    forecastBuilt: (hours: number) => `Forecast built: ${hours} h ahead`,
    trainedOn: (hours: number, mae?: string, rmse?: string) => `Trained on ${hours} h. MAE ${mae}, RMSE ${rmse}`,
    model: 'Model',
    horizon: 'Horizon, hours',
    history: 'History, days',
    arimaP: 'p (AR order)',
    arimaD: 'd (differencing)',
    arimaQ: 'q (MA order)',
    processNoise: 'Process noise',
    measurementNoise: 'Measurement noise',
    kalmanNote:
      'Relative to the variance of hourly changes. Higher process noise follows the data faster, higher measurement noise smooths more.',
    rounds: 'Boosting rounds',
    depth: 'Max tree depth',
    lastRun: (when: string) => `Last run ${when}`,
    notRun: 'Not run yet. Forecasts refresh every hour.',
    runNow: 'Run now',
    runNote:
      'Run now uses the saved settings, submit changes first. Errors are measured on the last hours the model did not see.',
  },
};

const optionalNumber = z
  .string()
  .optional()
  .refine(v => v === undefined || v === '' || Number.isFinite(Number(v)), {
    error: () => pick(TEXTS).mustBeNumber,
  });

export const DeviceSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(255).optional(),
    criticalValue: optionalNumber,
    lowerValue: optionalNumber,
    delaySeconds: z.coerce.number<string>().min(1, { error: () => pick(TEXTS).atLeastSecond }),
    type: z.enum(DeviceType).optional(),
    controllerId: z.string().optional(),
    sensorModel: z.string().optional(),
    pin: z.string().optional(),
    secondaryPin: z.string().optional(),
    calibrationDry: optionalNumber,
    calibrationWet: optionalNumber,
    forecastModel: z.string().optional(),
    forecastHorizonHours: optionalNumber,
    forecastHistoryDays: optionalNumber,
    arimaP: optionalNumber,
    arimaD: optionalNumber,
    arimaQ: optionalNumber,
    kalmanProcessNoise: optionalNumber,
    kalmanMeasurementNoise: optionalNumber,
    xgbRounds: optionalNumber,
    xgbMaxDepth: optionalNumber,
  })
  .superRefine((value, ctx) => {
    if (!value.controllerId || value.controllerId === NO_CONTROLLER) return;
    if (!value.sensorModel) {
      ctx.addIssue({
        code: 'custom',
        path: ['sensorModel'],
        message: pick(TEXTS).selectModule,
      });
    }
    if (!value.pin) {
      ctx.addIssue({ code: 'custom', path: ['pin'], message: pick(TEXTS).selectPin });
    }
  });

export type DeviceFormValues = Partial<z.input<typeof DeviceSchema>>;

const str = (v?: number | null, fallback?: string) =>
  v === undefined || v === null ? fallback : String(v);

// the API sends null for empty fields, zod's optional() only accepts undefined
const opt = <T,>(v?: T | null) => (v === null ? undefined : v);

export function toDeviceFormValues(device: Device | null): DeviceFormValues {
  return {
    name: device?.name ?? '',
    description: device?.description ?? '',
    criticalValue: str(device?.criticalValue),
    lowerValue: str(device?.lowerValue),
    delaySeconds: String(Math.max(1, Math.round((device?.delay ?? 10000) / 1000))),
    type:
      device?.type && device.type !== 'UNKNOWN'
        ? (device.type as DeviceType)
        : undefined,
    controllerId: device?.controllerId
      ? String(device.controllerId)
      : NO_CONTROLLER,
    sensorModel: opt(device?.sensorModel),
    pin: str(device?.pin),
    secondaryPin: str(device?.secondaryPin),
    calibrationDry: str(device?.calibrationDry),
    calibrationWet: str(device?.calibrationWet),
    forecastModel: device?.forecastModel ?? 'NONE',
    forecastHorizonHours: str(device?.forecastHorizonHours, '24'),
    forecastHistoryDays: str(device?.forecastHistoryDays, '30'),
    arimaP: str(device?.arimaP, '2'),
    arimaD: str(device?.arimaD, '1'),
    arimaQ: str(device?.arimaQ, '1'),
    kalmanProcessNoise: str(device?.kalmanProcessNoise, '0.01'),
    kalmanMeasurementNoise: str(device?.kalmanMeasurementNoise, '1'),
    xgbRounds: str(device?.xgbRounds, '100'),
    xgbMaxDepth: str(device?.xgbMaxDepth, '4'),
  };
}

const num = (v?: string) => (v === undefined || v === '' ? undefined : Number(v));

export function toDeviceRequest(
  value: z.output<typeof DeviceSchema>
): DeviceRequest {
  const bound = value.controllerId && value.controllerId !== NO_CONTROLLER;
  return {
    name: value.name,
    description: value.description,
    criticalValue: num(value.criticalValue),
    lowerValue: num(value.lowerValue),
    delay: value.delaySeconds * 1000,
    type: value.type as DeviceTypeValue | undefined,
    controllerId: bound ? Number(value.controllerId) : undefined,
    sensorModel: bound ? (value.sensorModel as SensorModel) : undefined,
    pin: bound ? num(value.pin) : undefined,
    secondaryPin: bound ? num(value.secondaryPin) : undefined,
    calibrationDry: num(value.calibrationDry),
    calibrationWet: num(value.calibrationWet),
    forecastModel: (value.forecastModel ?? 'NONE') as ForecastModel,
    forecastHorizonHours: num(value.forecastHorizonHours),
    forecastHistoryDays: num(value.forecastHistoryDays),
    arimaP: num(value.arimaP),
    arimaD: num(value.arimaD),
    arimaQ: num(value.arimaQ),
    kalmanProcessNoise: num(value.kalmanProcessNoise),
    kalmanMeasurementNoise: num(value.kalmanMeasurementNoise),
    xgbRounds: num(value.xgbRounds),
    xgbMaxDepth: num(value.xgbMaxDepth),
  };
}

const ALL_TYPES = (Object.keys(DEVICE_TYPE_LABELS) as DeviceTypeValue[]).filter(
  type => type !== 'UNKNOWN'
);

const FORECAST_MODELS: ForecastModel[] = ['NONE', 'ARIMA', 'KALMAN', 'XGBOOST'];

type Tab = 'general' | 'alerts' | 'forecast' | 'calibration';

/**
 * Fields are spread over tabs, so a failed submit names the invalid fields instead of failing silently.
 */
export function notifyInvalidDevice(value: unknown) {
  const parsed = DeviceSchema.safeParse(value);
  if (parsed.success) return;
  const t = pick(TEXTS);
  const byField = new Map<string, string>();
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (!byField.has(field)) byField.set(field, `${t.fields[field] ?? field}: ${issue.message}`);
  }
  notification.error({
    message: t.checkSettings,
    description: [...byField.values()].join('. '),
  });
}

// TanStack form instance created with useAppForm in the parent modal
export function DeviceFormFields({ form, device }: { form: any; device?: Device | null }) {
  const [tab, setTab] = useState<Tab>('general');
  const t = useTexts(TEXTS);
  // a soil probe is calibrated from the raw values its board reports, so only once it is saved on a board
  const calibratable = !!device?.id && !!device.controllerId && device.sensorModel === 'SOIL_MOISTURE';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {(
          [
            ['general', t.tabs.general],
            ['alerts', t.tabs.alerts],
            ['forecast', t.tabs.forecast],
            ...(calibratable ? [['calibration', t.tabs.calibration]] : []),
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={clsx(
              'flex-1 rounded-md py-1 font-medium',
              tab === value ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'general' && <GeneralFields form={form} />}
      {tab === 'alerts' && <AlertFields form={form} />}
      {tab === 'forecast' && <ForecastFields form={form} device={device} />}
      {tab === 'calibration' && calibratable && <CalibrationFields form={form} device={device!} />}
    </div>
  );
}

function GeneralFields({ form }: { form: any }) {
  const { data: controllers } = useGetControllersQuery();
  const { data: models } = useGetSensorModelsQuery();
  const t = useTexts(TEXTS);

  return (
    <FieldGroup>
      <form.AppField
        name="name"
        children={(field: any) => (
          <field.TextField label={t.fields.name} placeholder={t.namePlaceholder} />
        )}
      />

      <form.AppField
        name="description"
        children={(field: any) => (
          <field.TextareaField label={t.fields.description} placeholder={t.descriptionPlaceholder} />
        )}
      />
      <GenerateDescription form={form} />

      <form.Subscribe
        selector={(state: any) => [state.values.controllerId, state.values.sensorModel]}
        children={([controllerId, sensorModel]: [string, string]) => {
          const bound = controllerId && controllerId !== NO_CONTROLLER;
          const model = models?.find(m => m.model === sensorModel);
          const platform = controllerPlatform(controllers, Number(controllerId));
          const board = controllers?.find(c => c.id === Number(controllerId)) as ControllerWithRole | undefined;
          const pinOptions = getPinOptions(platform, model, board?.display);
          const types = bound && model?.supportedTypes ? model.supportedTypes : ALL_TYPES;

          return (
            <>
              <div className="flex flex-wrap gap-2">
                <form.AppField
                  name="controllerId"
                  children={(field: any) => (
                    <field.SelectField
                      label={t.board}
                      className="w-[200px]"
                      options={[
                        { value: NO_CONTROLLER, label: t.notWired },
                        ...(controllers ?? []).map(c => ({
                          value: String(c.id),
                          label: `${c.name} (${c.platform ?? '?'})`,
                        })),
                      ]}
                    />
                  )}
                />

                {bound && (
                  <form.AppField
                    name="sensorModel"
                    listeners={{
                      onChange: ({ value }: { value: string }) => {
                        const next = models?.find(m => m.model === value);
                        const type = form.getFieldValue('type');
                        if (next?.supportedTypes && !next.supportedTypes.includes(type)) {
                          form.setFieldValue('type', next.supportedTypes[0]);
                        }
                        form.setFieldValue('pin', undefined);
                        form.setFieldValue('secondaryPin', undefined);
                      },
                    }}
                    children={(field: any) => (
                      <field.SelectField
                        label={t.sensorModule}
                        className="w-[200px]"
                        placeholder={t.selectModulePlaceholder}
                        options={(models ?? []).map(m => ({
                          value: m.model!,
                          label: m.label ?? m.model!,
                        }))}
                      />
                    )}
                  />
                )}
              </div>

              {bound && !controllers?.length && (
                <p className="text-sm text-slate-500">{t.noBoards}</p>
              )}

              {bound && model && (
                <>
                  <p className="text-sm text-slate-500">{model.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <form.AppField
                      name="pin"
                      children={(field: any) => (
                        <field.SelectField
                          label={t.pinOf(model.pins?.[0] ?? t.signal)}
                          className="w-[200px]"
                          placeholder={t.selectPinPlaceholder}
                          options={pinOptions}
                        />
                      )}
                    />
                    {(model.pins?.length ?? 0) > 1 && (
                      <form.AppField
                        name="secondaryPin"
                        children={(field: any) => (
                          <field.SelectField
                            label={t.pinOf(model.pins?.[1] ?? '')}
                            className="w-[200px]"
                            placeholder={t.selectPinPlaceholder}
                            options={pinOptions}
                          />
                        )}
                      />
                    )}
                  </div>
                </>
              )}

              <form.AppField
                name="type"
                children={(field: any) => (
                  <field.SelectField
                    label={t.measurement}
                    className="w-[200px]"
                    placeholder={t.selectMeasurement}
                    options={types.map(type => ({ value: type, label: DEVICE_TYPE_LABELS[type] }))}
                  />
                )}
              />
            </>
          );
        }}
      />

      <form.AppField
        name="delaySeconds"
        children={(field: any) => (
          <field.TextField label={t.interval} placeholder="10" />
        )}
      />
      <p className="-mt-3 text-xs text-slate-500">{t.intervalNote}</p>
    </FieldGroup>
  );
}

/**
 * Asks the language model for a description from the current form values. Hidden when the server has no
 * model configured; a device saved with an empty description gets one generated automatically.
 */
function GenerateDescription({ form }: { form: any }) {
  const { data: status } = useGetLlmStatusQuery();
  const [describe, { isLoading }] = useDescribeDeviceMutation();
  const t = useTexts(TEXTS);

  if (!status?.enabled) return null;

  const generate = async () => {
    const values = form.state.values;
    const parsed = DeviceSchema.safeParse({ ...values, name: values.name || t.sensor });
    if (!parsed.success) {
      notifyInvalidDevice({ ...values, name: values.name || t.sensor });
      return;
    }
    const res = await describe({ deviceRequest: toDeviceRequest(parsed.data) });
    if ('error' in res) {
      notification.error({ message: t.describeFailed, description: JSON.stringify(res.error) });
      return;
    }
    form.setFieldValue('description', res.data.text);
  };

  return (
    <div className="-mt-3 flex items-center gap-2 text-xs text-slate-500">
      <Button type="button" size="sm" variant="secondary" disabled={isLoading} onClick={generate}>
        {isLoading ? <Spinner /> : <Icon icon="lucide:sparkles" />}
        {t.generate}
      </Button>
      {t.generateNote}
    </div>
  );
}

/**
 * Soil moisture probe: the raw ADC value its board reports, taken as 0 % when dry and 100 % in water. The values
 * go to the board with the configuration after saving.
 */
function CalibrationFields({ form, device }: { form: any; device: Device }) {
  const { data: raw } = useGetRawReadingQuery({ id: device.id! }, { pollingInterval: 3000 });
  const current = raw ? Math.round(raw.value) : undefined;
  const t = useTexts(TEXTS);

  return (
    <FieldGroup>
      <p className="text-sm text-slate-500">{t.calibrationHelp}</p>
      <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
        {t.rawNow}{' '}
        <span className="font-mono font-semibold tabular-nums">{current ?? '—'}</span>
        <span className="ml-2 text-xs text-slate-500">
          {raw ? t.rawSent(fromNow(raw.timestamp)) : t.rawNone}
        </span>
      </div>
      <form.Subscribe
        selector={(state: any) => [state.values.calibrationDry, state.values.calibrationWet]}
        children={([dry, wet]: [string | undefined, string | undefined]) => {
          const d = Number(dry);
          const w = Number(wet);
          const preview =
            current !== undefined && dry && wet && d !== w
              ? Math.min(100, Math.max(0, Math.round(((d - current) * 100) / (d - w))))
              : undefined;
          return (
            <>
              <div className="flex items-end gap-2">
                <form.AppField
                  name="calibrationDry"
                  children={(field: any) => <field.TextField label={t.dry} placeholder={t.byDefault} />}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={current === undefined}
                  onClick={() => form.setFieldValue('calibrationDry', String(current))}
                >
                  {t.dryNow}
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <form.AppField
                  name="calibrationWet"
                  children={(field: any) => <field.TextField label={t.wet} placeholder={t.byDefault} />}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={current === undefined}
                  onClick={() => form.setFieldValue('calibrationWet', String(current))}
                >
                  {t.wetNow}
                </Button>
              </div>
              {preview !== undefined && (
                <p className="text-sm text-slate-600">{t.preview(preview)}</p>
              )}
              {dry && wet && d === w && <p className="text-sm text-red-600">{t.mustDiffer}</p>}
            </>
          );
        }}
      />
    </FieldGroup>
  );
}

function AlertFields({ form }: { form: any }) {
  const t = useTexts(TEXTS);
  return (
    <FieldGroup>
      <p className="text-sm text-slate-500">{t.alertsHelp}</p>
      <div className="flex gap-2">
        <form.AppField
          name="criticalValue"
          children={(field: any) => (
            <field.TextField label={t.upper} placeholder={t.notSet} />
          )}
        />
        <form.AppField
          name="lowerValue"
          children={(field: any) => (
            <field.TextField label={t.lower} placeholder={t.notSet} />
          )}
        />
      </div>
    </FieldGroup>
  );
}

function ForecastFields({ form, device }: { form: any; device?: Device | null }) {
  const [runForecast, { isLoading }] = usePredictMetricsMutation();
  const t = useTexts(TEXTS);

  const run = async () => {
    if (!device?.id) return;
    const res = await runForecast({ deviceId: device.id });
    if ('error' in res) {
      notification.error({ message: t.forecastFailed, description: JSON.stringify(res.error) });
    } else if (!res.data.done) {
      notification.warning({ message: res.data.message ?? t.forecastNotBuilt });
    } else {
      notification.success({
        message: t.forecastBuilt(res.data.forecastHours ?? 0),
        description: t.trainedOn(res.data.trainingHours ?? 0, res.data.mae?.toFixed(3), res.data.rmse?.toFixed(3)),
      });
    }
  };

  return (
    <form.Subscribe
      selector={(state: any) => state.values.forecastModel}
      children={(model: ForecastModel) => {
        const info = t.forecastModels[model];
        return (
          <FieldGroup>
            <form.AppField
              name="forecastModel"
              children={(field: any) => (
                <field.SelectField
                  label={t.model}
                  className="w-[200px]"
                  options={FORECAST_MODELS.map(m => ({ value: m, label: t.forecastModels[m][0] }))}
                />
              )}
            />
            {info && <p className="-mt-3 text-sm text-slate-500">{info[1]}</p>}

            {model && model !== 'NONE' && (
              <>
                <div className="flex gap-2">
                  <form.AppField
                    name="forecastHorizonHours"
                    children={(field: any) => <field.TextField label={t.horizon} />}
                  />
                  <form.AppField
                    name="forecastHistoryDays"
                    children={(field: any) => <field.TextField label={t.history} />}
                  />
                </div>

                {model === 'ARIMA' && (
                  <div className="flex gap-2">
                    <form.AppField name="arimaP" children={(field: any) => <field.TextField label={t.arimaP} />} />
                    <form.AppField name="arimaD" children={(field: any) => <field.TextField label={t.arimaD} />} />
                    <form.AppField name="arimaQ" children={(field: any) => <field.TextField label={t.arimaQ} />} />
                  </div>
                )}

                {model === 'KALMAN' && (
                  <>
                    <div className="flex gap-2">
                      <form.AppField
                        name="kalmanProcessNoise"
                        children={(field: any) => <field.TextField label={t.processNoise} />}
                      />
                      <form.AppField
                        name="kalmanMeasurementNoise"
                        children={(field: any) => <field.TextField label={t.measurementNoise} />}
                      />
                    </div>
                    <p className="-mt-3 text-xs text-slate-500">{t.kalmanNote}</p>
                  </>
                )}

                {model === 'XGBOOST' && (
                  <div className="flex gap-2">
                    <form.AppField name="xgbRounds" children={(field: any) => <field.TextField label={t.rounds} />} />
                    <form.AppField name="xgbMaxDepth" children={(field: any) => <field.TextField label={t.depth} />} />
                  </div>
                )}

                {device?.id && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                    <div className="flex-1 text-slate-600">
                      {device.forecastUpdatedAt ? (
                        <>
                          {t.lastRun(fromNow(device.forecastUpdatedAt))} · MAE{' '}
                          <b>{device.forecastMae?.toFixed(3)}</b> · RMSE <b>{device.forecastRmse?.toFixed(3)}</b>
                        </>
                      ) : (
                        t.notRun
                      )}
                    </div>
                    <Button type="button" size="sm" variant="secondary" disabled={isLoading} onClick={run}>
                      {isLoading && <Spinner />}
                      {t.runNow}
                    </Button>
                  </div>
                )}
                {device?.id && (
                  <p className="-mt-3 text-xs text-slate-500">{t.runNote}</p>
                )}
              </>
            )}
          </FieldGroup>
        );
      }}
    />
  );
}
