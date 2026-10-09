import React from 'react';

// Shared Solar-style sequence marker for all new chord charts.
export default function StepBadge({ x, y, step, color = '#cc480e' }) {
  return <g data-chart-label="true" aria-label={`Step ${step}`}>
    <circle cx={x} cy={y} r="16" fill={color} />
    <text x={x} y={y + 6} textAnchor="middle" fill="#fbf8ed" fontFamily="Georgia, serif" fontSize="19">{step}</text>
  </g>;
}
