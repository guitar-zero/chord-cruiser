import React from 'react';

// Shared Solar-style sequence marker for all new chord charts.
export default function StepBadge({ x, y, step, color = '#cc480e' }) {
  const label = Array.isArray(step) ? step.join(', ') : String(step);
  const width = Math.max(32, label.length * 11 + 16);
  return <g data-chart-label="true" aria-label={`Steps ${label}`}>
    <rect x={x - width / 2} y={y - 16} width={width} height="32" rx="16" fill={color} />
    <text x={x} y={y + 6} textAnchor="middle" fill="#fbf8ed" fontFamily="Georgia, serif" fontSize="19">{label}</text>
  </g>;
}
