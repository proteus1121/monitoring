import { Icon } from '@iconify/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@src/components/Select';
import { MODULE_HEADERS, ModuleArt, ModuleKey, powerTarget } from './ModuleArt';
import type { PinOption } from '@src/lib/hardware';

/**
 * The module drawing next to its pin header: each signal pin with a GPIO select, power pins with where they go.
 * `pins` holds the chosen GPIO (as string) for each signal name, e.g. { DATA: '16' }.
 */
export function ModuleWiring(props: {
  module: ModuleKey;
  pins: Record<string, string>;
  options: PinOption[];
  onChange: (signal: string, gpio: string) => void;
}) {
  const header = MODULE_HEADERS[props.module] ?? [];
  const chosen = Object.values(props.pins).filter(Boolean);
  const unset = header.filter(pin => pin.signal && !props.pins[pin.signal]).map(pin => pin.label);

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex shrink-0 items-start justify-center rounded-lg bg-gray-50 p-3 sm:w-[190px]">
        <ModuleArt module={props.module} highlight={unset} className="w-full max-w-[170px]" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="text-xs font-medium text-slate-500">Module pin → board pin</div>
        {header.map(pin => (
          <div key={pin.label} className="flex items-center gap-2 text-sm">
            <span
              className={`w-12 shrink-0 font-mono text-xs ${pin.signal ? 'font-bold text-slate-900' : 'text-slate-500'}`}
            >
              {pin.label}
            </span>
            <Icon icon="lucide:arrow-right" className="size-3.5 shrink-0 text-slate-400" />
            {pin.signal ? (
              <Select value={props.pins[pin.signal] ?? ''} onValueChange={value => props.onChange(pin.signal!, value)}>
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Choose a pin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {props.options.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        // one GPIO per line of the module
                        disabled={
                          option.disabled ||
                          (chosen.includes(option.value) && props.pins[pin.signal!] !== option.value)
                        }
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : pin.label === 'DO' ? (
              <span className="text-xs text-slate-400">not used</span>
            ) : (
              <span className="font-mono text-xs text-slate-600">{powerTarget(pin.label)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
