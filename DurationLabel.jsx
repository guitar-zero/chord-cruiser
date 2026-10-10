import React from 'react';

export default function DurationLabel({ x, y, children }) {
  const width = String(children).length * 9 + 20;
  return <g data-chart-label="true" aria-label={`Duration: ${children}`}>
    <rect x={x - width / 2} y={y - 16} width={width} height="26" rx="7" fill="#fbf8ed" />
    <text x={x} y={y + 3} textAnchor="middle" fill="#62736d" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif" fontSize="19">{children}</text>
  </g>;
}
