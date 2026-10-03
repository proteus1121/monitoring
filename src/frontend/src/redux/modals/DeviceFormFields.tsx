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

// value of the controller select when the device is not wired to a board
export const NO_CONTROLLER = 'none';

const optionalNumber = z
  .string()
  .optional()
  .refine(v => v === undefined || v === '' || Number.isFinite(Number(v)), {
    message: 'Must be a number',
  });

export const DeviceSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(255).optional(),
    criticalValue: optionalNumber,
    lowerValue: optionalNumber,
    delaySeconds: z.coerce.number<string>().min(1, 'At least 1 second'),
    type: z.enum(DeviceType).optional(),
    controllerId: z.string().optional(),
    sensorModel: z.string().optional(),
    pin: z.string().optional(),
    secondaryPin: z.string().optional(),
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
        message: 'Select the module wired to the controller',
      });
    }
    if (!value.pin) {
      ctx.addIssue({ code: 'custom', path: ['pin'], message: 'Select the pin' });
    }
  });

export type DeviceFormValues = Partial<z.input<typeof DeviceSchema>>;

const str = (v?: number | null, fallback?: string) =>
  v === undefined || v === null ? fallback : String(v);

export function toDeviceFormValues(device: Device | null): DeviceFormValues {
  return {
    name: device?.name ?? '',
    description: device?.description,
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
    sensorModel: device?.sensorModel,
    pin: str(device?.pin),
    secondaryPin: str(device?.secondaryPin),
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

const FORECAST_MODELS: { value: ForecastModel; label: string; hint: string }[] = [
  { value: 'NONE', label: 'No forecast', hint: 'The device is not forecast.' },
  {
    value: 'ARIMA',
    label: 'ARIMA',
    hint: 'Autoregressive integrated moving average ARIMA(p, d, q). Good for smooth series with a trend.',
  },
  {
    value: 'KALMAN',
    label: 'Kalman filter',
    hint: 'Local level + damped trend tracked by a Kalman filter. Robust to noisy sensors, adapts quickly.',
  },
  {
    value: 'XGBOOST',
    label: 'XGBoost',
    hint: 'Gradient boosted trees on the time of day, day of week and recent values. Captures daily patterns.',
  },
];

type Tab = 'general' | 'alerts' | 'forecast';

// TanStack form instance created with useAppForm in the parent modal
export function DeviceFormFields({ form, device }: { form: any; device?: Device | null }) {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {(
          [
            ['general', 'General'],
            ['alerts', 'Alerts'],
            ['forecast', 'Forecast'],
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
    </div>
  );
}

function GeneralFields({ form }: { form: any }) {
  const { data: controllers } = useGetControllersQuery();
  const { data: models } = useGetSensorModelsQuery();

  return (
    <FieldGroup>
      <form.AppField
        name="name"
        children={(field: any) => (
          <field.TextField label="Device name" placeholder="Kitchen temperature" />
        )}
      />

      <form.AppField
        name="description"
        children={(field: any) => (
          <field.TextareaField label="Description" placeholder="Where it is, what it measures" />
        )}
      />
      <GenerateDescription form={form} />

      <form.Subscribe
        selector={(state: any) => [state.values.controllerId, state.values.sensorModel]}
        children={([controllerId, sensorModel]: [string, string]) => {
          const bound = controllerId && controllerId !== NO_CONTROLLER;
          const model = models?.find(m => m.model === sensorModel);
          const platform = controllerPlatform(controllers, Number(controllerId));
          const pinOptions = getPinOptions(platform, model);
          const types = bound && model?.supportedTypes ? model.supportedTypes : ALL_TYPES;

          return (
            <>
              <div className="flex flex-wrap gap-2">
                <form.AppField
                  name="controllerId"
                  children={(field: any) => (
                    <field.SelectField
                      label="Board"
                      className="w-[200px]"
                      options={[
                        { value: NO_CONTROLLER, label: 'Not wired to a board' },
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
                        label="Sensor module"
                        className="w-[200px]"
                        placeholder="Select module"
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
                <p className="text-sm text-slate-500">
                  No boards yet. Flash the firmware and enter your User ID in the board setup portal.
                </p>
              )}

              {bound && model && (
                <>
                  <p className="text-sm text-slate-500">{model.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <form.AppField
                      name="pin"
                      children={(field: any) => (
                        <field.SelectField
                          label={`${model.pins?.[0] ?? 'Signal'} pin`}
                          className="w-[200px]"
                          placeholder="Select pin"
                          options={pinOptions}
                        />
                      )}
                    />
                    {(model.pins?.length ?? 0) > 1 && (
                      <form.AppField
                        name="secondaryPin"
                        children={(field: any) => (
                          <field.SelectField
                            label={`${model.pins?.[1]} pin`}
                            className="w-[200px]"
                            placeholder="Select pin"
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
                    label="Measurement"
                    className="w-[200px]"
                    placeholder="Select measurement"
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
          <field.TextField label="Send interval, seconds" placeholder="10" />
        )}
      />
      <p className="-mt-3 text-xs text-slate-500">
        How often the board sends the value. The device is shown offline after three missed intervals.
      </p>
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

  if (!status?.enabled) return null;

  const generate = async () => {
    const values = form.state.values;
    const parsed = DeviceSchema.safeParse({ ...values, name: values.name || 'Sensor' });
    if (!parsed.success) {
      notification.warning({ message: 'Fill in the name, board and module first' });
      return;
    }
    const res = await describe({ deviceRequest: toDeviceRequest(parsed.data) });
    if ('error' in res) {
      notification.error({ message: 'Could not generate a description', description: JSON.stringify(res.error) });
      return;
    }
    form.setFieldValue('description', res.data.text);
  };

  return (
    <div className="-mt-3 flex items-center gap-2 text-xs text-slate-500">
      <Button type="button" size="sm" variant="secondary" disabled={isLoading} onClick={generate}>
        {isLoading ? <Spinner /> : <Icon icon="lucide:sparkles" />}
        Generate
      </Button>
      Written by AI from the name, module and pin. Left empty, it is generated after saving.
    </div>
  );
}

function AlertFields({ form }: { form: any }) {
  return (
    <FieldGroup>
      <p className="text-sm text-slate-500">
        An alert is raised when a value goes above the upper or below the lower threshold. Leave
        empty to disable. Notification channels are set on the Alerts page.
      </p>
      <div className="flex gap-2">
        <form.AppField
          name="criticalValue"
          children={(field: any) => (
            <field.TextField label="Upper threshold" placeholder="not set" />
          )}
        />
        <form.AppField
          name="lowerValue"
          children={(field: any) => (
            <field.TextField label="Lower threshold" placeholder="not set" />
          )}
        />
      </div>
    </FieldGroup>
  );
}

function ForecastFields({ form, device }: { form: any; device?: Device | null }) {
  const [runForecast, { isLoading }] = usePredictMetricsMutation();

  const run = async () => {
    if (!device?.id) return;
    const res = await runForecast({ deviceId: device.id });
    if ('error' in res) {
      notification.error({ message: 'Forecast failed', description: JSON.stringify(res.error) });
    } else if (!res.data.done) {
      notification.warning({ message: res.data.message ?? 'Forecast was not built' });
    } else {
      notification.success({
        message: `Forecast built: ${res.data.forecastHours} h ahead`,
        description: `Trained on ${res.data.trainingHours} h. MAE ${res.data.mae?.toFixed(3)}, RMSE ${res.data.rmse?.toFixed(3)}`,
      });
    }
  };

  return (
    <form.Subscribe
      selector={(state: any) => state.values.forecastModel}
      children={(model: ForecastModel) => {
        const info = FORECAST_MODELS.find(m => m.value === model);
        return (
          <FieldGroup>
            <form.AppField
              name="forecastModel"
              children={(field: any) => (
                <field.SelectField
                  label="Model"
                  className="w-[200px]"
                  options={FORECAST_MODELS.map(m => ({ value: m.value, label: m.label }))}
                />
              )}
            />
            {info && <p className="-mt-3 text-sm text-slate-500">{info.hint}</p>}

            {model && model !== 'NONE' && (
              <>
                <div className="flex gap-2">
                  <form.AppField
                    name="forecastHorizonHours"
                    children={(field: any) => <field.TextField label="Horizon, hours" />}
                  />
                  <form.AppField
                    name="forecastHistoryDays"
                    children={(field: any) => <field.TextField label="History, days" />}
                  />
                </div>

                {model === 'ARIMA' && (
                  <div className="flex gap-2">
                    <form.AppField name="arimaP" children={(field: any) => <field.TextField label="p (AR order)" />} />
                    <form.AppField name="arimaD" children={(field: any) => <field.TextField label="d (differencing)" />} />
                    <form.AppField name="arimaQ" children={(field: any) => <field.TextField label="q (MA order)" />} />
                  </div>
                )}

                {model === 'KALMAN' && (
                  <>
                    <div className="flex gap-2">
                      <form.AppField
                        name="kalmanProcessNoise"
                        children={(field: any) => <field.TextField label="Process noise" />}
                      />
                      <form.AppField
                        name="kalmanMeasurementNoise"
                        children={(field: any) => <field.TextField label="Measurement noise" />}
                      />
                    </div>
                    <p className="-mt-3 text-xs text-slate-500">
                      Relative to the variance of hourly changes. Higher process noise follows the data faster,
                      higher measurement noise smooths more.
                    </p>
                  </>
                )}

                {model === 'XGBOOST' && (
                  <div className="flex gap-2">
                    <form.AppField name="xgbRounds" children={(field: any) => <field.TextField label="Boosting rounds" />} />
                    <form.AppField name="xgbMaxDepth" children={(field: any) => <field.TextField label="Max tree depth" />} />
                  </div>
                )}

                {device?.id && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                    <div className="flex-1 text-slate-600">
                      {device.forecastUpdatedAt ? (
                        <>
                          Last run {fromNow(device.forecastUpdatedAt)} · MAE{' '}
                          <b>{device.forecastMae?.toFixed(3)}</b> · RMSE <b>{device.forecastRmse?.toFixed(3)}</b>
                        </>
                      ) : (
                        'Not run yet. Forecasts refresh every hour.'
                      )}
                    </div>
                    <Button type="button" size="sm" variant="secondary" disabled={isLoading} onClick={run}>
                      {isLoading && <Spinner />}
                      Run now
                    </Button>
                  </div>
                )}
                {device?.id && (
                  <p className="-mt-3 text-xs text-slate-500">
                    Run now uses the saved settings, submit changes first. Errors are measured on the last hours
                    the model did not see.
                  </p>
                )}
              </>
            )}
          </FieldGroup>
        );
      }}
    />
  );
}
