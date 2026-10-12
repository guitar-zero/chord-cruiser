import React from 'react';
import { darkerTimelineColor } from './data/timelinePresentation.js';

export default function CountInChordNode({ chord, shape = 'circle', color = 'var(--accent)', darkMode }) {
  const label = chord.replaceAll('b', '♭').replaceAll('#', '♯');
  const common = { fill: color, stroke: darkerTimelineColor(color), strokeWidth: 4 };
  const r = 75, cx = 120, cy = 84;
  const outline = shape === 'circle' ? <circle {...common} cx={cx} cy={cy} r={r} />
    : shape === 'square' ? <rect {...common} x={cx - r / Math.sqrt(2)} y={cy - r / Math.sqrt(2)} width={r * Math.sqrt(2)} height={r * Math.sqrt(2)} rx="5" />
    : <polygon {...common} strokeLinejoin="round" points={(shape === 'triangle'
      ? [[0, -r], [Math.sqrt(3) * r / 2, r / 2], [-Math.sqrt(3) * r / 2, r / 2]]
      : Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * r, Math.sin(i * Math.PI / 3) * r]))
      .map(([x, y]) => `${cx + x},${cy + y}`).join(' ')} />;
  const available = shape === 'square' ? 90 : shape === 'triangle' ? 100 : 130;
  return <svg className="count-in-chord-node" viewBox="0 0 240 168" role="img" aria-label={`First chord: ${label}`}>
    {React.cloneElement(outline, { fill: 'none', stroke: color, strokeOpacity: .3, strokeWidth: 7, transform: `translate(${cx} ${cy}) scale(1.08) translate(${-cx} ${-cy})` })}
    {outline}
    <text x={cx} y={shape === 'triangle' ? cy + r * .15 : cy} textAnchor="middle" dominantBaseline="middle" fontFamily="system-ui, sans-serif" fontSize={Math.min(32, available / (label.length * .62))} fontWeight="800" fill="#050505">{label}</text>
  </svg>;
}
