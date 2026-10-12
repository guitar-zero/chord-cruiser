import React, { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function IndicatorLaunch({ flight, onComplete }) {
  const ref = useRef(null);
  const [touchdown, setTouchdown] = useState(null);
  useEffect(() => {
    if (!touchdown) return;
    const timeout = setTimeout(() => setTouchdown(null), 550);
    return () => clearTimeout(timeout);
  }, [touchdown]);
  useEffect(() => {
    if (!flight) {
      return;
    }
    let frame, started;
    const animate = (time) => {
      started ??= time;
      // The initial game flight follows the audio clock and lands on GO.
      // Other launches retain their short travel animation.
      const t = flight.progress ? flight.progress() : Math.min(1, (time - started) / 750);
      const emergeFraction = flight.emergeFraction || 0;
      const travel = emergeFraction ? Math.max(0, (t - emergeFraction) / (1 - emergeFraction)) : t;
      const bloom = emergeFraction ? Math.min(1, t / emergeFraction) : 1;
      const bounds = flight.destination?.getBoundingClientRect();
      const sourceBounds =
        flight.followLine && flight.source?.getBoundingClientRect();
      const from = sourceBounds
        ? {
            x: sourceBounds.x + sourceBounds.width / 2,
            y: sourceBounds.y + sourceBounds.height / 2,
          }
        : flight.documentCoordinates
          ? {
              x: flight.from.x - window.scrollX,
              y: flight.from.y - window.scrollY,
            }
          : flight.from;
      const to = bounds
        ? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
        : flight.to;
      const x = from.x + (to.x - from.x) * travel;
      const y =
        from.y +
        (to.y - from.y) * travel -
        (flight.followLine
          ? 0
          : 4 *
            travel *
            (1 - travel) *
            Math.min(180, Math.abs(to.x - from.x) * 0.2 + 100));
      const fromSize = flight.fromSize ? flight.fromSize * 1.15 : emergeFraction ? 52 : 28;
      const size = (fromSize + (flight.size * 1.15 - fromSize) * travel)
        * (bloom + .18 * Math.sin(Math.PI * bloom));
      if (ref.current) {
        ref.current.style.visibility = 'visible';
        ref.current.style.opacity = Math.min(1, bloom * 3);
        ref.current.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0) scale(${size / 100})`;
      }
      if (t < 1) frame = requestAnimationFrame(animate);
      else {
        setTouchdown({ x: to.x, y: to.y, size: Math.max(70, flight.size * 1.8) });
        onComplete();
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [flight, onComplete]);
  return createPortal(
    <>
    {touchdown && <svg className="indicator-touchdown" aria-hidden="true"
      viewBox="-50 -50 100 100"
      style={{ left: touchdown.x, top: touchdown.y, width: touchdown.size, height: touchdown.size }}>
      <circle className="indicator-touchdown-ring" r="22" />
      {Array.from({ length: 12 }, (_, i) => <g key={i} transform={`rotate(${i * 30})`}>
        <path className="indicator-touchdown-spark" d="M 0 -25 L 0 -38" />
      </g>)}
    </svg>}
    {flight &&
    <svg
      ref={ref}
      data-playback-indicator="true"
      aria-hidden="true"
      viewBox="0 0 100 100"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        visibility: 'hidden',
        transformOrigin: '0 0',
        willChange: 'transform',
        pointerEvents: "none",
        zIndex: 1600,
        overflow: "visible",
      }}
    >
      <path
        d={path}
        fill="#e534ae"
        fillOpacity=".09"
        stroke="#e534ae"
        strokeWidth="12"
        strokeOpacity=".18"
      />
      <path d={path} fill="none" stroke="#e534ae" strokeWidth="4" />
    </svg>
    }
    </>, document.body
  );
}

const path = Array.from({ length: 193 }, (_, i) => {
  const a = (i / 192) * Math.PI * 2, r = 42 + 5 * Math.cos(a * 8);
  return `${i ? 'L' : 'M'}${50 + Math.cos(a) * r} ${50 + Math.sin(a) * r}`;
}).join(' ') + ' Z';

export default memo(IndicatorLaunch);
