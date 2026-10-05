import type { ReactNode } from 'react';
import type { BoardModel } from '@src/redux/generatedApi';

/**
 * Drawings of the supported boards in the style of ModuleArt: the PCB, the Wi-Fi module with its shield and
 * antenna, USB, buttons and the pin headers.
 */

const SHIELD = '#d4d4d8';
const SHIELD_EDGE = '#71717a';
const GOLD = '#ca8a04';

// a row of header pins between x0 and x1
function Row({ x0, x1, y, count }: { x0: number; x1: number; y: number; count: number }) {
  const step = (x1 - x0) / (count - 1);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={x0 + step * i - 1.3} y={y - 1.3} width={2.6} height={2.6} fill={GOLD} />
      ))}
    </>
  );
}

// a column of header pins between y0 and y1
function Column({ x, y0, y1, count }: { x: number; y0: number; y1: number; count: number }) {
  const step = (y1 - y0) / (count - 1);
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={x - 1.3} y={y0 + step * i - 1.3} width={2.6} height={2.6} fill={GOLD} />
      ))}
    </>
  );
}

// the name engraved on the module's shield
function Engraving({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={5.5} fontWeight={700} fill="#52525b" fontFamily="sans-serif">
      {text}
    </text>
  );
}

function Button({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x} y={y} width={6} height={6} rx={0.8} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={0.5} />
      <circle cx={x + 3} cy={y + 3} r={1.6} fill="#374151" />
    </>
  );
}

// PCB trace antenna of the Wi-Fi module
function Meander({ x, y, width, height, vertical }: { x: number; y: number; width: number; height: number; vertical?: boolean }) {
  const turns = 4;
  const points: string[] = [];
  for (let i = 0; i <= turns; i++) {
    if (vertical) {
      const px = x + (width / turns) * i;
      points.push(`${px},${i % 2 ? y : y + height}`, `${px},${i % 2 ? y + height : y}`);
    } else {
      const py = y + (height / turns) * i;
      points.push(`${i % 2 ? x : x + width},${py}`, `${i % 2 ? x + width : x},${py}`);
    }
  }
  return <polyline points={points.join(' ')} fill="none" stroke={GOLD} strokeWidth={1} />;
}

function Body({ board }: { board: BoardModel }): ReactNode {
  switch (board) {
    case 'NODEMCU':
      return (
        <>
          <rect x={4} y={10} width={92} height={46} rx={2} fill="#1e293b" />
          <Row x0={16} x1={86} y={14} count={15} />
          <Row x0={16} x1={86} y={52} count={15} />
          {/* ESP-12E: antenna on the left end, shield over the chip */}
          <rect x={6} y={19} width={42} height={28} rx={1} fill="#0f172a" stroke="#334155" strokeWidth={0.6} />
          <Meander x={8} y={21} width={8} height={24} />
          <rect x={18} y={21} width={28} height={24} rx={0.8} fill={SHIELD} stroke={SHIELD_EDGE} strokeWidth={0.6} />
          <Engraving x={32} y={35} text="ESP8266" />
          <rect x={60} y={29} width={8} height={8} fill="#111827" stroke="#475569" strokeWidth={0.4} />
          <circle cx={54} cy={24} r={1.2} fill="#38bdf8" />
          <Button x={76} y={20} />
          <Button x={76} y={40} />
          <rect x={88} y={28} width={11} height={10} rx={1} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.6} />
        </>
      );
    case 'D1_MINI':
      return (
        <>
          <rect x={22} y={4} width={56} height={56} rx={2} fill="#1d4ed8" />
          <Column x={26} y0={12} y1={52} count={8} />
          <Column x={74} y0={12} y1={52} count={8} />
          {/* ESP-12F: antenna at the top */}
          <rect x={32} y={7} width={36} height={36} rx={1} fill="#0f172a" stroke="#1e3a8a" strokeWidth={0.6} />
          <Meander x={35} y={9} width={30} height={7} vertical />
          <rect x={34} y={18} width={32} height={23} rx={0.8} fill={SHIELD} stroke={SHIELD_EDGE} strokeWidth={0.6} />
          <Engraving x={50} y={31.5} text="ESP8266" />
          <Button x={32} y={47} />
          <rect x={52} y={47} width={6} height={6} fill="#111827" />
          <rect x={44} y={56} width={12} height={8} rx={1} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.6} />
        </>
      );
    case 'ESP32_DEVKIT':
      return (
        <>
          <rect x={2} y={10} width={94} height={46} rx={2} fill="#111827" />
          <Row x0={20} x1={88} y={14} count={15} />
          <Row x0={20} x1={88} y={52} count={15} />
          {/* ESP-WROOM-32: PCB antenna on the left end */}
          <rect x={4} y={19} width={40} height={28} rx={1} fill="#020617" stroke="#334155" strokeWidth={0.6} />
          <Meander x={6} y={21} width={8} height={24} />
          <rect x={16} y={21} width={26} height={24} rx={0.8} fill={SHIELD} stroke={SHIELD_EDGE} strokeWidth={0.6} />
          <Engraving x={29} y={35} text="ESP32" />
          <rect x={58} y={29} width={8} height={8} fill="#1f2937" stroke="#475569" strokeWidth={0.4} />
          <circle cx={52} cy={24} r={1.2} fill="#ef4444" />
          <Button x={76} y={20} />
          <Button x={76} y={40} />
          <rect x={88} y={28} width={11} height={10} rx={1} fill="#cbd5e1" stroke="#64748b" strokeWidth={0.6} />
        </>
      );
    case 'ESP32_CAM':
      return (
        <>
          <rect x={26} y={2} width={48} height={62} rx={2} fill="#111827" />
          <Column x={30} y0={30} y1={60} count={8} />
          <Column x={70} y0={30} y1={60} count={8} />
          {/* ESP32-S module with its antenna at the top, the camera on its ribbon next to it */}
          <Meander x={34} y={4} width={32} height={6} vertical />
          <rect x={34} y={12} width={32} height={16} rx={0.8} fill={SHIELD} stroke={SHIELD_EDGE} strokeWidth={0.6} />
          <Engraving x={50} y={22} text="ESP32-S" />
          <rect x={40} y={34} width={20} height={20} rx={2} fill="#1f2937" stroke="#475569" strokeWidth={0.6} />
          <circle cx={50} cy={44} r={7} fill="#020617" stroke="#64748b" strokeWidth={1} />
          <circle cx={50} cy={44} r={3} fill="#1e3a8a" />
          <circle cx={48.5} cy={42.5} r={1} fill="#93c5fd" />
          <rect x={40} y={57} width={6} height={4} fill="#fef9c3" stroke="#a16207" strokeWidth={0.4} />
          <Button x={58} y={59} />
        </>
      );
  }
}

export function BoardArt(props: { board: BoardModel; className?: string }) {
  return (
    <svg viewBox="0 0 100 66" className={props.className} role="img" aria-label={props.board}>
      <Body board={props.board} />
    </svg>
  );
}
