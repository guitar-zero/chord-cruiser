import React, { useLayoutEffect, useState } from 'react';

export default function CurrentChordIndicator({ svgRef, target, initial }) {
  const [box, setBox] = useState(initial);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    if (!target) { setBox(initial); return; }
    const selector = target.section ? `[data-section="${target.section}"] [data-node-id="${target.node}"]` : `[data-node-id="${target.node}"]`;
    const node = svg.querySelector(selector);
    const shape = node?.querySelector('circle, rect');
    if (!shape) { setBox(null); return; }
    const bounds = shape.getBBox();
    setBox({ x: bounds.x - 9, y: bounds.y - 9, width: bounds.width + 18, height: bounds.height + 18 });
  }, [target?.node, target?.section, svgRef]);
  if (!box) return null;
  return <g aria-label={target ? 'Current chord' : 'Starting chord'} pointerEvents="none">
    <rect x="0" y="0" width={box.width} height={box.height} rx="18" fill="none" stroke="#cc480e" strokeWidth="5" style={{ transform: `translate(${box.x}px, ${box.y}px)`, transition: 'transform 180ms ease-out, width 180ms ease-out, height 180ms ease-out' }} />
  </g>;
}
