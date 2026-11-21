// Komponen kecil untuk gaya "panel perangkat": readout angka, LED, baut, dan bar segmen.

import React from 'react';

type SegTone = 'amber' | 'ok' | 'fault' | 'off';

/**
 * Readout angka (Gold, HP, skor) dengan huruf Share Tech Mono dan cahaya LED.
 * `digits` menambah nol di depan bila diminta lewat `pad`, dan mengunci lebar supaya angka tidak "loncat".
 */
export function Seg({
  value,
  digits,
  tone = 'amber',
  className = '',
}: {
  value: string | number;
  digits?: number;
  tone?: SegTone;
  className?: string;
}) {
  const shown = String(value);
  const toneClass = tone === 'amber' ? '' : `seg-${tone}`;
  return (
    <span
      className={`seg inline-block ${toneClass} ${className}`}
      style={digits ? { minWidth: `${digits * 0.6}em` } : undefined}
    >
      {shown}
    </span>
  );
}

export function Led({
  tone = 'off',
  blink = false,
  className = '',
}: {
  tone?: 'off' | 'amber' | 'ok' | 'fault' | 'dim-fault';
  blink?: boolean;
  className?: string;
}) {
  const toneClass = tone === 'off' ? '' : `led-${tone}`;
  return <span aria-hidden="true" className={`led ${toneClass} ${blink ? 'led-blink' : ''} ${className}`} />;
}

export function Screw({ angle = 35, className = '' }: { angle?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`screw inline-block ${className}`}
      style={{ ['--slot' as string]: `${angle}deg` } as React.CSSProperties}
    />
  );
}

/** Bar dari sel LED, dipakai untuk HP core dan HP boss. */
export function SegmentBar({
  pct,
  cells = 12,
  color,
  glow,
  className = '',
}: {
  pct: number;
  cells?: number;
  color?: string;
  glow?: string;
  className?: string;
}) {
  const lit = Math.ceil((Math.max(0, Math.min(100, pct)) / 100) * cells);
  const style = {
    ...(color ? { ['--seg-color' as string]: color } : {}),
    ...(glow ? { ['--seg-glow' as string]: glow } : {}),
  } as React.CSSProperties;
  return (
    <div aria-hidden="true" className={`seg-bar ${className}`} style={style}>
      {Array.from({ length: cells }, (_, i) => (
        <i key={i} className={i < lit ? 'on' : ''} />
      ))}
    </div>
  );
}
