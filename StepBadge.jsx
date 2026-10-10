import React from 'react';

// Shared Solar-style sequence marker for all new chord charts.
export default function StepBadge({ x, y, step, color = '#cc480e' }) {
  const label = Array.isArray(step) ? step.join(', ') : String(step);
  const width = Math.max(40, label.length * 14 + 18);
  return <g data-chart-label="true" aria-label={`Steps ${label}`}>
    <rect x={x - width / 2} y={y - 20} width={width} height="40" rx="20" fill={color} />
    <text x={x} y={y + 8} textAnchor="middle" fill="#fbf8ed" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontSize="24" fontWeight="600">{label}</text>
  </g>;
}
