import z from 'zod';
import { FieldGroup } from '@src/components/Field';
import { DeviceType } from '@src/lib/api/api.types';
import {
  DEVICE_TYPE_LABELS,
  controllerPlatform,
  getPinOptions,
} from '@src/lib/hardware';
import {
  Device,
  DeviceRequest,
  DeviceTypeValue,
  SensorModel,
  useGetControllersQuery,
  useGetSensorModelsQuery,
} from '../generatedApi';

// value of the controller select when the device is not wired to a board
export const NO_CONTROLLER = 'none';

export const DeviceSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(255).optional(),
    criticalValue: z.coerce.number<string>().or(z.undefined()),
    lowerValue: z.coerce.number<string>().or(z.undefined()),
    delay: z.coerce.number<string>(),
    type: z.enum(DeviceType).optional(),
    controllerId: z.string().optional(),
    sensorModel: z.string().optional(),
    pin: z.string().optional(),
    secondaryPin: z.string().optional(),
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
      ctx.addIssue({
        code: 'custom',
        path: ['pin'],
        message: 'Select the pin',
      });
    }
  });

export type DeviceFormValues = Partial<z.input<typeof DeviceSchema>>;

export function toDeviceFormValues(device: Device | null): DeviceFormValues {
  return {
    name: device?.name ?? '',
    description: device?.description,
    criticalValue: device?.criticalValue?.toString(),
    lowerValue: device?.lowerValue?.toString(),
    delay: (device?.delay ?? 10000).toString(),
    type:
      device?.type && device.type !== 'UNKNOWN'
        ? (device.type as DeviceType)
        : undefined,
    controllerId: device?.controllerId
      ? String(device.controllerId)
      : NO_CONTROLLER,
    sensorModel: device?.sensorModel,
    pin: device?.pin?.toString(),
    secondaryPin: device?.secondaryPin?.toString(),
  };
}

export function toDeviceRequest(
  value: z.output<typeof DeviceSchema>
): DeviceRequest {
  const bound = value.controllerId && value.controllerId !== NO_CONTROLLER;
  return {
    name: value.name,
    description: value.description,
    criticalValue: value.criticalValue,
    lowerValue: value.lowerValue,
    delay: value.delay,
    type: value.type as DeviceTypeValue | undefined,
    controllerId: bound ? Number(value.controllerId) : undefined,
    sensorModel: bound ? (value.sensorModel as SensorModel) : undefined,
    pin: bound && value.pin ? Number(value.pin) : undefined,
    secondaryPin: bound && value.secondaryPin ? Number(value.secondaryPin) : undefined,
  };
}

const ALL_TYPES = (Object.keys(DEVICE_TYPE_LABELS) as DeviceTypeValue[]).filter(
  type => type !== 'UNKNOWN'
);

// TanStack form instance created with useAppForm in the parent modal
export function DeviceFormFields({ form }: { form: any }) {
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
          <field.TextareaField
            label="Description"
            placeholder="Does something interesting"
          />
        )}
      />

      <form.Subscribe
        selector={(state: any) => [
          state.values.controllerId,
          state.values.sensorModel,
        ]}
        children={([controllerId, sensorModel]: [string, string]) => {
          const bound = controllerId && controllerId !== NO_CONTROLLER;
          const model = models?.find(m => m.model === sensorModel);
          const platform = controllerPlatform(controllers, Number(controllerId));
          const pinOptions = getPinOptions(platform, model);
          const types =
            bound && model?.supportedTypes ? model.supportedTypes : ALL_TYPES;

          return (
            <>
              <div className="flex flex-wrap gap-2">
                <form.AppField
                  name="controllerId"
                  children={(field: any) => (
                    <field.SelectField
                      label="Controller"
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
                  No controllers yet. Flash the firmware and enter your User ID
                  in the board setup portal.
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
                    options={types.map(type => ({
                      value: type,
                      label: DEVICE_TYPE_LABELS[type],
                    }))}
                  />
                )}
              />
            </>
          );
        }}
      />

      <div className="flex gap-2">
        <form.AppField
          name="criticalValue"
          children={(field: any) => (
            <field.TextField label="Critical value" placeholder="0" />
          )}
        />

        <form.AppField
          name="lowerValue"
          children={(field: any) => (
            <field.TextField label="Lower value" placeholder="0" />
          )}
        />
      </div>

      <form.AppField
        name="delay"
        children={(field: any) => (
          <field.TextField label="Send interval (ms)" placeholder="10000" />
        )}
      />
    </FieldGroup>
  );
}
