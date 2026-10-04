import { useMemo } from 'react';
import type { ControllerWithRole } from '@src/redux/controllersApi';
import { ModuleArt } from '@src/components/ModuleArt';
import {
  BoardPin,
  DEVICE_TYPE_LABELS,
  DISPLAY_PIN_NAMES,
  boardLayout,
  reservedPinNote,
} from '@src/lib/hardware';
import type {
  Controller,
  Device,
  SensorModelInfo,
} from '@src/redux/generatedApi';

const PIN_STEP = 24;
const BOARD_W = 170;
const BOARD_TOP = 70; // room for the antenna / chip above the headers
const BOARD_BOTTOM = 44; // room for the USB connector
const MODULE_W = 230;
const GAP = 90; // between board and modules, the wires run here
const MODULE_HEADER = 30;
const MODULE_ROW = 22;
const MODULE_GAP = 14;

// distinguishable wire colors, one per module
const WIRE_COLORS = [
  '#2563eb',
  '#d97706',
  '#059669',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#dc2626',
  '#65a30d',
];

const STATUS_COLORS: Record<string, string> = {
  OK: '#22c55e',
  WARNING: '#f97316',
  CRITICAL: '#ef4444',
  OFFLINE: '#6b7280',
};

type Side = 'left' | 'right';

type PinRef = {
  side: Side;
  row: number;
  pin: BoardPin;
};

type Module = {
  key: string;
  label: string;
  pinNames: string[];
  pins: (PinRef | undefined)[];
  gpios: number[];
  devices: Device[];
  color: string;
  side: Side;
  y: number;
  height: number;
  // the board's display: no device rows, the pins are listed in the body
  display?: boolean;
  // module drawn in the header (SensorModel or display model)
  art?: string;
};

const DISPLAY_COLOR = '#334155';

function pinY(row: number) {
  return BOARD_TOP + row * PIN_STEP + PIN_STEP / 2;
}

export function BoardDiagram(props: {
  controller: Controller;
  devices: Device[];
  models: SensorModelInfo[] | undefined;
  onDeviceClick: (device: Device) => void;
  onDisplayClick?: () => void;
}) {
  const { controller, devices, models, onDeviceClick, onDisplayClick } = props;
  const display = (controller as ControllerWithRole).display;
  const layout = boardLayout(controller.platform, (controller as ControllerWithRole).boardModel);

  const findPin = (gpio?: number): PinRef | undefined => {
    if (gpio === undefined || gpio === null) return undefined;
    for (const side of ['left', 'right'] as Side[]) {
      const row = layout[side].findIndex(pin => pin.gpio === gpio);
      if (row >= 0) return { side, row, pin: layout[side][row] };
    }
    return undefined;
  };

  const modules = useMemo(() => {
    // devices on the same module and pins share one physical module
    const groups = new Map<string, Device[]>();
    for (const device of devices) {
      const key = `${device.sensorModel}:${device.pin}:${device.secondaryPin ?? ''}`;
      groups.set(key, [...(groups.get(key) ?? []), device]);
    }

    const list: Module[] = [...groups.entries()].map(([key, group], index) => {
      const first = group[0];
      const info = models?.find(m => m.model === first.sensorModel);
      const gpios = [first.pin!, first.secondaryPin].filter(
        (gpio): gpio is number => gpio !== undefined && gpio !== null
      );
      const pins = gpios.map(findPin);
      return {
        key,
        label: info?.label ?? first.sensorModel ?? 'Module',
        art: first.sensorModel,
        pinNames: info?.pins ?? [],
        pins,
        gpios,
        devices: [...group].sort((a, b) => (a.id ?? 0) - (b.id ?? 0)),
        color: WIRE_COLORS[index % WIRE_COLORS.length],
        side: pins[0]?.side ?? 'right',
        y: 0,
        height: MODULE_HEADER + group.length * MODULE_ROW + 8,
      };
    });

    if (display && display.model !== 'NONE' && display.pins.length) {
      const pins = display.pins.map(findPin);
      list.push({
        key: 'display',
        label: `Display · ${display.model}`,
        pinNames: DISPLAY_PIN_NAMES[display.model],
        pins,
        gpios: display.pins,
        devices: [],
        color: DISPLAY_COLOR,
        side: pins[0]?.side ?? 'right',
        y: 0,
        // wires end 10 px apart below the header line
        height: Math.max(MODULE_HEADER + 26, MODULE_HEADER / 2 + display.pins.length * 10 + 8),
        display: true,
        art: display.model,
      });
    }

    // stack modules next to their pins without overlapping
    for (const side of ['left', 'right'] as Side[]) {
      let bottom = 0;
      list
        .filter(m => m.side === side)
        .sort((a, b) => (a.pins[0]?.row ?? 99) - (b.pins[0]?.row ?? 99))
        .forEach(m => {
          const desired = m.pins[0] ? pinY(m.pins[0].row) - MODULE_HEADER / 2 : bottom;
          m.y = Math.max(desired, bottom);
          bottom = m.y + m.height + MODULE_GAP;
        });
    }
    return list;
  }, [devices, models, controller.platform, display]);

  const rows = Math.max(layout.left.length, layout.right.length);
  const boardH = BOARD_TOP + rows * PIN_STEP + BOARD_BOTTOM;
  const boardX = MODULE_W + GAP;
  const width = boardX + BOARD_W + GAP + MODULE_W;
  const height =
    Math.max(boardH, ...modules.map(m => m.y + m.height)) + 10;

  const usedGpios = new Set(modules.flatMap(m => m.gpios));

  const renderHeader = (side: Side) =>
    layout[side].map((pin, row) => {
      const x = side === 'left' ? boardX : boardX + BOARD_W;
      const y = pinY(row);
      const used = pin.gpio !== undefined && usedGpios.has(pin.gpio);
      const note = reservedPinNote(controller.platform, pin.gpio, (controller as ControllerWithRole).display);
      const power = pin.gpio === undefined;
      return (
        <g key={`${side}-${row}`}>
          <title>
            {pin.label}
            {pin.gpio !== undefined ? ` (GPIO${pin.gpio})` : ''}
            {note ? ` - ${note}` : ''}
          </title>
          <circle
            cx={x}
            cy={y}
            r={used ? 5 : 4}
            fill={used ? '#facc15' : note ? '#9ca3af' : '#e5e7eb'}
            stroke="#a16207"
            strokeWidth={used ? 1.5 : 0.8}
          />
          <text
            x={side === 'left' ? x + 12 : x - 12}
            y={y + 4}
            textAnchor={side === 'left' ? 'start' : 'end'}
            fontSize={11}
            fontFamily="ui-monospace, monospace"
            fill={power ? '#9ca3af' : note ? '#cbd5e1' : '#f8fafc'}
          >
            {pin.label}
          </text>
          {note && (
            <text
              x={side === 'left' ? x - 9 : x + 9}
              y={y + 4}
              textAnchor={side === 'left' ? 'end' : 'start'}
              fontSize={9}
              fill="#94a3b8"
            >
              {note}
            </text>
          )}
        </g>
      );
    });

  const renderWire = (module: Module, pinIndex: number, index: number) => {
    const pin = module.pins[pinIndex];
    if (!pin) return null;
    const startX = pin.side === 'left' ? boardX : boardX + BOARD_W;
    const startY = pinY(pin.row);
    const moduleEdge =
      pin.side === 'left' ? MODULE_W : boardX + BOARD_W + GAP;
    // stagger vertical segments so wires of different modules do not merge
    const offset = 16 + ((index * 2 + pinIndex) % 6) * 10;
    const midX = pin.side === 'left' ? startX - offset : startX + offset;
    const endY = module.y + MODULE_HEADER / 2 + pinIndex * 10;
    return (
      <polyline
        key={`${module.key}-wire-${pinIndex}`}
        points={`${startX},${startY} ${midX},${startY} ${midX},${endY} ${moduleEdge},${endY}`}
        fill="none"
        stroke={module.color}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    );
  };

  const renderModule = (module: Module) => {
    const x = module.side === 'left' ? 0 : boardX + BOARD_W + GAP;
    const pinText = module.gpios
      .map((gpio, i) => {
        const pin = findPin(gpio);
        return `${module.pinNames[i] ?? 'pin'}→${pin?.pin.label ?? `GPIO${gpio}`}`;
      })
      // five display pins only fit with single spaces
      .join(module.display ? ' ' : '  ');
    return (
      <g key={module.key}>
        <rect
          x={x}
          y={module.y}
          width={MODULE_W}
          height={module.height}
          rx={8}
          fill="#ffffff"
          stroke={module.color}
          strokeWidth={2}
        />
        <g
          className="cursor-pointer"
          onClick={() => (module.display ? onDisplayClick?.() : module.devices[0] && onDeviceClick(module.devices[0]))}
        >
          <title>{module.display ? 'Edit the display' : `Edit ${module.devices[0]?.name ?? ''}`}</title>
          <rect
            x={x}
            y={module.y}
            width={MODULE_W}
            height={MODULE_HEADER - 4}
            rx={8}
            fill={module.color}
            fillOpacity={0.12}
            className="hover:fill-opacity-25"
          />
          {module.art && (
            <ModuleArt module={module.art} showLabels={false} x={x + 5} y={module.y + 3} width={28} height={19} />
          )}
          <text x={x + (module.art ? 38 : 10)} y={module.y + 17} fontSize={12} fontWeight={600} fill="#0f172a">
            {module.label}
          </text>
        </g>
        <text
          x={module.display ? x + 10 : x + MODULE_W - 10}
          y={module.display ? module.y + MODULE_HEADER + 14 : module.y + 17}
          fontSize={10}
          textAnchor={module.display ? 'start' : 'end'}
          fontFamily="ui-monospace, monospace"
          fill="#475569"
        >
          {pinText}
        </text>
        {module.devices.map((device, i) => {
          const rowY = module.y + MODULE_HEADER + i * MODULE_ROW + 12;
          return (
            <g
              key={device.id}
              className="cursor-pointer"
              onClick={() => onDeviceClick(device)}
            >
              <title>Edit {device.name}</title>
              <rect
                x={x + 4}
                y={rowY - 13}
                width={MODULE_W - 8}
                height={MODULE_ROW - 2}
                rx={4}
                fill="transparent"
                className="hover:fill-slate-100"
              />
              <circle
                cx={x + 14}
                cy={rowY - 4}
                r={4}
                fill={STATUS_COLORS[device.status ?? 'OFFLINE'] ?? '#6b7280'}
              />
              <text x={x + 24} y={rowY} fontSize={11} fill="#0f172a">
                {truncate(device.name ?? '', 20)}
              </text>
              <text
                x={x + MODULE_W - 10}
                y={rowY}
                fontSize={10}
                textAnchor="end"
                fill="#64748b"
              >
                {device.type ? DEVICE_TYPE_LABELS[device.type] : ''}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      // grow on wide screens, shrink on phones; the aspect ratio comes from the viewBox
      style={{ width: '100%', maxWidth: width * 1.35, height: 'auto' }}
      role="img"
      aria-label={`Wiring of ${controller.name}`}
    >
      {/* board */}
      <rect
        x={boardX}
        y={0}
        width={BOARD_W}
        height={boardH}
        rx={10}
        fill="#1e3a5f"
      />
      {/* ESP module with antenna */}
      <rect x={boardX + 35} y={8} width={BOARD_W - 70} height={50} rx={3} fill="#cbd5e1" />
      <path
        d={`M${boardX + 45} 18 h20 v12 h12 v-12 h12 v12 h12 v-12 h12`}
        fill="none"
        stroke="#64748b"
        strokeWidth={2}
      />
      <text
        x={boardX + BOARD_W / 2}
        y={52}
        textAnchor="middle"
        fontSize={9}
        fill="#334155"
      >
        {controller.platform === 'esp8266' ? 'ESP-12E' : 'ESP32-WROOM'}
      </text>
      <text
        x={boardX + BOARD_W / 2}
        y={boardH - 34}
        textAnchor="middle"
        fontSize={9}
        fill="#94a3b8"
      >
        {layout.name}
      </text>
      {/* USB connector */}
      <rect
        x={boardX + BOARD_W / 2 - 22}
        y={boardH - 26}
        width={44}
        height={26}
        rx={3}
        fill="#9ca3af"
      />
      <text
        x={boardX + BOARD_W / 2}
        y={boardH - 9}
        textAnchor="middle"
        fontSize={9}
        fill="#1f2937"
      >
        USB
      </text>

      {modules.map((module, index) =>
        module.pins.map((_, pinIndex) => renderWire(module, pinIndex, index))
      )}
      {renderHeader('left')}
      {renderHeader('right')}
      {modules.map(renderModule)}
    </svg>
  );
}

function truncate(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
