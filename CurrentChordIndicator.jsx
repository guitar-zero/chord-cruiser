import React, { useEffect, useRef, useState } from 'react';
import { pointAlongRoute } from './src/data/motion.js';

const center = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

export default function CurrentChordIndicator({ svgRef, target, initial }) {
  const [box, setBox] = useState(initial);
  const previous = useRef(null);
  const displayed = useRef(initial);
  // Passive effects run after the parent SVG ref is attached. A newly mounted
  // carousel panel must position its indicator even on its very first chord.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const old = previous.current;
    previous.current = target;
    const shape = target && svg.querySelector(`[data-node-id="${target.node}"]`)?.querySelector('[data-node-shape]');
    const bounds = shape?.getBBox();
    const destination = !target ? initial : bounds ? { x: bounds.x - 9, y: bounds.y - 9, width: bounds.width + 18, height: bounds.height + 18 } : null;
    const start = displayed.current;
    const show = value => { displayed.current = value; setBox(value); };
    const sequential = old && target && target.visitIndex === old.visitIndex + 1 && target.seekVersion === old.seekVersion;
    if (!destination || !start || !sequential || old.node === target.node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(destination); return; }
    const group = [...svg.querySelectorAll('[data-source][data-target]')].find(edge => edge.dataset.source === old.node && edge.dataset.target === target.node);
    const path = group?.querySelector('path[data-arrow-tip]');
    const points = [center(start)];
    if (path) {
      const length = path.getTotalLength();
      for (let i = 0; i <= 100; i++) {
        const point = path.getPointAtLength(length * i / 100);
        points.push({ x: point.x, y: point.y });
      }
    }
    points.push(center(destination));
    let frame, started;
    function animate(time) {
      started ??= time;
      const progress = Math.min(1, (time - started) / 220);
      const eased = progress * progress * (3 - 2 * progress);
      const position = pointAlongRoute(points, eased);
      const width = start.width + (destination.width - start.width) * eased;
      const height = start.height + (destination.height - start.height) * eased;
      show({ x: position.x - width / 2, y: position.y - height / 2, width, height });
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target?.node, target?.visitIndex, target?.seekVersion, svgRef]);
  if (!box) return null;
  const { x, y, width, height } = box;
  const radius = Math.max(width, height) / 2 + 13;
  const flower = Array.from({ length: 193 }, (_, i) => {
    const angle = i / 192 * Math.PI * 2;
    const petal = radius + 8 * Math.cos(angle * 8);
    return `${i ? 'L' : 'M'}${Math.cos(angle) * petal} ${Math.sin(angle) * petal}`;
  }).join(' ') + ' Z';
  return <g aria-label={target ? 'Current chord' : 'Starting chord'} pointerEvents="none">
    <style>{`
      .chord-flower-spin { filter: drop-shadow(0 3px 5px #c91b9855); transform-origin: 0 0; animation: chord-flower-turn 9s linear infinite; }
      @keyframes chord-flower-turn { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .chord-flower-spin { animation: none; } }
    `}</style>
    <g transform={`translate(${x + width / 2} ${y + height / 2})`}>
      <g className={target ? 'chord-flower-spin' : undefined}>
        <path d={flower} fill="#e534ae" fillOpacity=".09" stroke="#e534ae" strokeWidth="20" strokeOpacity=".18" />
        <path d={flower} fill="none" stroke="#e534ae" strokeWidth="6" strokeLinejoin="round" />
      </g>
    </g>
  </g>;
}
