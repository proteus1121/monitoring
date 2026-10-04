import type { ReactNode } from 'react';

/**
 * Drawings of the modules the firmware drives, with their pin header as printed on the module.
 * Signal pins (wired to a GPIO) are highlighted, power pins are grey. Usable standalone or nested in another
 * SVG through x / y / width / height.
 */

export type ModuleKey =
  | 'DHT11'
  | 'DHT22'
  | 'MQ2'
  | 'BMP180'
  | 'FLAME_IR'
  | 'LIGHT_DIGITAL'
  | 'PIR'
  | 'DIGITAL_INPUT'
  | 'SOIL_MOISTURE'
  | 'ANALOG_INPUT'
  | 'RELAY'
  | 'ST7565'
  | 'SSD1306'
  | 'SH1106';

type HeaderPin = {
  // as printed on the module
  label: string;
  // pin name used by the site / firmware (SensorModel.pins, display pins), undefined for power
  signal?: string;
};

const POWER = (label: string): HeaderPin => ({ label });

/**
 * Pin header of each module; `signal` links a printed pin to the pin the site asks a GPIO for.
 */
export const MODULE_HEADERS: Record<ModuleKey, HeaderPin[]> = {
  DHT11: [POWER('VCC'), { label: 'DATA', signal: 'DATA' }, POWER('GND')],
  DHT22: [POWER('VCC'), { label: 'DATA', signal: 'DATA' }, POWER('GND')],
  MQ2: [POWER('VCC'), POWER('GND'), { label: 'DO' }, { label: 'AO', signal: 'AO' }],
  BMP180: [POWER('VIN'), POWER('GND'), { label: 'SCL', signal: 'SCL' }, { label: 'SDA', signal: 'SDA' }],
  FLAME_IR: [POWER('VCC'), POWER('GND'), { label: 'DO', signal: 'DO' }],
  LIGHT_DIGITAL: [POWER('VCC'), POWER('GND'), { label: 'DO', signal: 'DO' }],
  PIR: [POWER('VCC'), { label: 'OUT', signal: 'OUT' }, POWER('GND')],
  DIGITAL_INPUT: [{ label: 'IN', signal: 'IN' }, POWER('GND')],
  SOIL_MOISTURE: [POWER('GND'), POWER('VCC'), { label: 'AOUT', signal: 'AO' }],
  ANALOG_INPUT: [POWER('VCC'), { label: 'AO', signal: 'AO' }, POWER('GND')],
  RELAY: [POWER('VCC'), POWER('GND'), { label: 'IN', signal: 'IN' }],
  // the ST7565 board labels its SPI lines this way
  ST7565: [
    { label: 'CS', signal: 'CS' },
    { label: 'RSE', signal: 'RST' },
    { label: 'RS', signal: 'DC' },
    { label: 'SCL', signal: 'CLK' },
    { label: 'SI', signal: 'DIN' },
    POWER('VDD'),
    POWER('VSS'),
  ],
  SSD1306: [POWER('GND'), POWER('VCC'), { label: 'SCL', signal: 'SCL' }, { label: 'SDA', signal: 'SDA' }],
  SH1106: [POWER('GND'), POWER('VCC'), { label: 'SCL', signal: 'SCL' }, { label: 'SDA', signal: 'SDA' }],
};

// where power pins go on both boards
export function powerTarget(label: string) {
  return label === 'GND' || label === 'VSS' ? 'GND' : '3V3';
}

const PCB_BLUE = '#1d4ed8';
const PCB_PURPLE = '#6d28d9';
const PCB_GREEN = '#15803d';
const PCB_BLACK = '#1e293b';

function Body({ module }: { module: ModuleKey }): ReactNode {
  switch (module) {
    case 'DHT11':
    case 'DHT22': {
      const white = module === 'DHT22';
      return (
        <>
          <rect x={30} y={4} width={40} height={50} rx={3} fill={white ? '#f8fafc' : '#38bdf8'} stroke="#0f172a" />
          {[0, 1, 2, 3, 4].flatMap(row =>
            [0, 1, 2, 3].map(col => (
              <rect
                key={`${row}-${col}`}
                x={35 + col * 8}
                y={9 + row * 8}
                width={6}
                height={5}
                rx={1}
                fill={white ? '#cbd5e1' : '#0c4a6e'}
              />
            ))
          )}
        </>
      );
    }
    case 'MQ2':
      return (
        <>
          <rect x={12} y={34} width={76} height={20} rx={2} fill={PCB_BLUE} />
          <circle cx={50} cy={26} r={22} fill="#d4d4d8" stroke="#52525b" />
          <circle cx={50} cy={26} r={15} fill="#a1a1aa" />
          {[-10, -5, 0, 5, 10].map(d => (
            <line key={d} x1={50 + d} y1={13} x2={50 + d} y2={39} stroke="#71717a" strokeWidth={1} />
          ))}
          <rect x={74} y={40} width={8} height={8} fill="#2563eb" stroke="#fff" strokeWidth={0.8} />
        </>
      );
    case 'BMP180':
      return (
        <>
          <rect x={22} y={10} width={56} height={44} rx={3} fill={PCB_PURPLE} />
          <rect x={41} y={23} width={18} height={14} rx={1.5} fill="#e2e8f0" stroke="#94a3b8" />
          <circle cx={50} cy={30} r={1.6} fill="#64748b" />
          <circle cx={28} cy={16} r={3} fill="none" stroke="#c4b5fd" />
          <circle cx={72} cy={16} r={3} fill="none" stroke="#c4b5fd" />
        </>
      );
    case 'FLAME_IR':
    case 'LIGHT_DIGITAL':
      return (
        <>
          <rect x={18} y={20} width={64} height={34} rx={2} fill={PCB_BLUE} />
          {module === 'FLAME_IR' ? (
            <>
              <rect x={44} y={2} width={12} height={22} rx={6} fill="#111827" />
              <circle cx={50} cy={8} r={4} fill="#374151" />
            </>
          ) : (
            <>
              <circle cx={50} cy={12} r={9} fill="#fb923c" stroke="#9a3412" />
              <polyline points="44,12 46,8 48,16 50,8 52,16 54,8 56,12" fill="none" stroke="#7c2d12" strokeWidth={1.2} />
            </>
          )}
          <rect x={26} y={32} width={12} height={12} fill="#2563eb" stroke="#fff" strokeWidth={0.8} />
          <line x1={29} y1={38} x2={35} y2={38} stroke="#fff" />
          <circle cx={70} cy={30} r={2} fill="#ef4444" />
          <circle cx={70} cy={40} r={2} fill="#22c55e" />
        </>
      );
    case 'PIR':
      return (
        <>
          <rect x={18} y={32} width={64} height={22} rx={2} fill={PCB_GREEN} />
          <path d="M26 36 A24 24 0 0 1 74 36 Z" fill="#f8fafc" stroke="#94a3b8" />
          {[34, 42, 50, 58, 66].map(x => (
            <line key={x} x1={x} y1={36} x2={50 + (x - 50) * 0.4} y2={14} stroke="#cbd5e1" />
          ))}
        </>
      );
    case 'RELAY':
      return (
        <>
          <rect x={8} y={14} width={84} height={40} rx={2} fill={PCB_BLUE} />
          <rect x={18} y={6} width={38} height={40} rx={2} fill="#1e40af" stroke="#93c5fd" />
          <text x={37} y={29} textAnchor="middle" fontSize={8} fill="#e0f2fe" fontFamily="sans-serif">
            SRD
          </text>
          {[0, 1, 2].map(i => (
            <g key={i}>
              <rect x={62 + i * 9} y={22} width={8} height={14} fill="#16a34a" stroke="#14532d" />
              <circle cx={66 + i * 9} cy={29} r={2.3} fill="#d4d4d8" />
            </g>
          ))}
        </>
      );
    case 'SOIL_MOISTURE':
      // capacitive probe: a long blade that goes into the soil, the electronics at the top
      return (
        <>
          <path d="M38 12 H62 V44 L50 58 L38 44 Z" fill={PCB_BLACK} />
          <rect x={41} y={15} width={18} height={8} rx={1} fill="#334155" />
          <line x1={50} y1={28} x2={50} y2={50} stroke="#94a3b8" strokeWidth={2} />
          <path d="M44 48 q6 -6 12 0" fill="none" stroke="#38bdf8" strokeWidth={1.5} />
        </>
      );
    case 'ANALOG_INPUT':
      return (
        <>
          <rect x={22} y={14} width={56} height={40} rx={2} fill={PCB_BLACK} />
          <circle cx={50} cy={32} r={13} fill="#2563eb" stroke="#bfdbfe" />
          <line x1={50} y1={32} x2={58} y2={24} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
        </>
      );
    case 'DIGITAL_INPUT':
      return (
        <>
          <rect x={28} y={14} width={44} height={40} rx={3} fill="#334155" />
          <text x={50} y={38} textAnchor="middle" fontSize={11} fill="#e2e8f0" fontFamily="monospace">
            0/1
          </text>
        </>
      );
    case 'ST7565':
      return (
        <>
          <rect x={4} y={4} width={92} height={50} rx={2} fill={PCB_GREEN} />
          <rect x={10} y={9} width={80} height={40} rx={1} fill="#a3c48b" stroke="#365314" />
          <rect x={16} y={16} width={30} height={4} fill="#3f6212" />
          <rect x={16} y={24} width={50} height={4} fill="#3f6212" />
          <rect x={16} y={32} width={40} height={4} fill="#3f6212" />
        </>
      );
    case 'SSD1306':
    case 'SH1106':
      return (
        <>
          <rect x={16} y={4} width={68} height={50} rx={3} fill={PCB_BLACK} />
          <rect x={20} y={10} width={60} height={36} fill="#020617" stroke="#475569" />
          <rect x={24} y={14} width={22} height={3} fill="#38bdf8" />
          <rect x={24} y={22} width={44} height={6} fill="#38bdf8" />
          <rect x={24} y={33} width={34} height={6} fill="#38bdf8" />
        </>
      );
  }
}

export function ModuleArt(props: {
  module: ModuleKey | string | undefined | null;
  // highlight these printed pin labels (e.g. the one being chosen)
  highlight?: string[];
  showLabels?: boolean;
  className?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const module = props.module as ModuleKey;
  const header = MODULE_HEADERS[module];
  if (!header) return null;
  const showLabels = props.showLabels ?? true;
  const step = 84 / header.length;
  return (
    <svg
      viewBox={`0 0 100 ${showLabels ? 82 : 66}`}
      className={props.className}
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      role="img"
      aria-label={module}
    >
      <Body module={module} />
      {header.map((pin, i) => {
        const x = 8 + step * i + step / 2;
        const signal = !!pin.signal;
        const lit = props.highlight?.includes(pin.label);
        return (
          <g key={pin.label}>
            <line x1={x} y1={54} x2={x} y2={64} stroke={signal ? '#ca8a04' : '#9ca3af'} strokeWidth={2.4} />
            <rect
              x={x - 3}
              y={56}
              width={6}
              height={5}
              fill={lit ? '#facc15' : '#1f2937'}
              stroke={lit ? '#a16207' : 'none'}
            />
            {showLabels && (
              <text
                x={x}
                y={77}
                textAnchor="middle"
                fontSize={step < 13 ? 6.5 : 8}
                fontFamily="ui-monospace, monospace"
                fontWeight={signal ? 700 : 400}
                fill={signal ? '#0f172a' : '#6b7280'}
              >
                {pin.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
