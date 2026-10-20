import React, { memo, useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { routeSampler } from "./src/data/motion.js";

const center = (box) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

function CurrentChordIndicator({
  svgRef,
  target,
  initial,
  directMotion = false,
  onMotion,
  onArrival,
  itemName = 'chord',
  fastChords = false,
}) {
  const [box, setBox] = useState(initial);
  const previous = useRef(null);
  const displayed = useRef(initial);
  const [viewport, setViewport] = useState(null);
  const overlayRef = useRef(null), positionRef = useRef(null), haloRef = useRef(null), outlineRef = useRef(null);
  const paintedRadius = useRef(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !target) return;
    const measure = () => {
      const bounds = svg.getBoundingClientRect();
      const view = {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        viewBox: svg.getAttribute("viewBox"),
      };
      if (overlayRef.current) {
        Object.assign(overlayRef.current.style, { left: `${view.left}px`, top: `${view.top}px`, width: `${view.width}px`, height: `${view.height}px` });
        overlayRef.current.setAttribute('viewBox', view.viewBox);
      } else setViewport(view);
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [svgRef, target?.node]);
  // Passive effects run after the parent SVG ref is attached. A newly mounted
  // carousel panel must position its indicator even on its very first chord.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const old = previous.current;
    previous.current = target;
    const shape =
      target &&
      svg
        .querySelector(`[data-node-id="${target.node}"]`)
        ?.querySelector("[data-node-shape]");
    const bounds = shape?.getBBox();
    const destination = !target
      ? initial
      : bounds
        ? {
            x: bounds.x - 9,
            y: bounds.y - 9,
            width: bounds.width + 18,
            height: bounds.height + 18,
          }
        : null;
    const start = displayed.current;
    const show = (value, progress = 1) => {
      displayed.current = value;
      if (value && positionRef.current) {
        positionRef.current.setAttribute('transform', `translate(${value.x + value.width / 2} ${value.y + value.height / 2})`);
        const radius = Math.round((Math.max(value.width, value.height) / 2 + 23) * 10) / 10;
        if (paintedRadius.current !== radius) {
          const path = flowerPath(radius);
          haloRef.current?.setAttribute('d', path); outlineRef.current?.setAttribute('d', path);
          paintedRadius.current = radius;
        }
      }
      onMotion?.(
        value ? center(value) : null,
        progress,
        old?.node,
        target?.node,
      );
    };
    const sequential =
      old &&
      target &&
      target.visitIndex === old.visitIndex + 1 &&
      target.seekVersion === old.seekVersion;
    if (
      !destination ||
      !start ||
      !sequential ||
      old.node === target.node ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setBox(destination);
      show(destination);
      onArrival?.(destination ? target : null);
      return;
    }
    const group = [...svg.querySelectorAll("[data-source][data-target]")].find(
      (edge) =>
        edge.dataset.source === old.node && edge.dataset.target === target.node,
    );
    const path = directMotion
      ? null
      : group?.querySelector("path[data-arrow-tip]");
    const points = [center(start)];
    if (path) {
      const length = path.getTotalLength();
      for (let i = 0; i <= 100; i++) {
        const point = path.getPointAtLength((length * i) / 100);
        points.push({ x: point.x, y: point.y });
      }
    }
    points.push(center(destination));
    const sample = routeSampler(points);
    let frame, started;
    function animate(time) {
      started ??= time;
      const progress = Math.min(1, (time - started) / 280);
      const eased = progress * progress * (3 - 2 * progress);
      const position = sample(eased);
      const width = start.width + (destination.width - start.width) * eased;
      const height = start.height + (destination.height - start.height) * eased;
      show(
        {
          x: position.x - width / 2,
          y: position.y - height / 2,
          width,
          height,
        },
        eased,
      );
      if (progress < 1) frame = requestAnimationFrame(animate);
      else { setBox(destination); onArrival?.(target); }
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [
    target?.node,
    target?.visitIndex,
    target?.seekVersion,
    svgRef,
    directMotion,
    onMotion,
    onArrival,
  ]);
  const { x, y, width, height } = box || { x: 0, y: 0, width: 0, height: 0 };
  const radius = Math.max(width, height) / 2 + 23;
  const flower = useMemo(() => flowerPath(radius), [radius]);
  if (!box || !target || !viewport) return null;
  return createPortal(
    <svg
      ref={overlayRef}
      aria-hidden="true"
      viewBox={viewport.viewBox}
      style={{
        position: "fixed",
        left: viewport.left,
        top: viewport.top,
        width: viewport.width,
        height: viewport.height,
        pointerEvents: "none",
        overflow: "visible",
        zIndex: 1600,
      }}
    >
      <g
        data-playback-indicator={target ? 'true' : undefined}
        aria-label={target ? `Current ${itemName}` : `Starting ${itemName}`}
        pointerEvents="none"
      >
        <style>{`
      .chord-flower-spin { transform-origin: 0 0; animation: chord-flower-turn 9s linear infinite; }
      @keyframes chord-flower-turn { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .chord-flower-spin { animation: none; } }
    `}</style>
        <g ref={positionRef} transform={`translate(${x + width / 2} ${y + height / 2})`}>
          <g className={target ? "chord-flower-spin" : undefined}>
            <path
              ref={haloRef}
              d={flower}
              fill="#e534ae"
              fillOpacity=".09"
              stroke="#e534ae"
              strokeWidth="20"
              strokeOpacity=".18"
            />
            <path
              ref={outlineRef}
              d={flower}
              fill="none"
              stroke="#e534ae"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          </g>
          {fastChords && <g transform={`translate(${radius * .8} ${-radius * .8})`}>
          <text className="fast-rocket-vibrate"
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="68"
            aria-hidden="true"
          >🚀</text></g>}
        </g>
      </g>
    </svg>,
    document.body,
  );
}

function flowerPath(radius) {
  return Array.from({ length: 193 }, (_, i) => {
    const angle = (i / 192) * Math.PI * 2;
    const petal = radius + 8 * Math.cos(angle * 8);
    return `${i ? 'L' : 'M'}${Math.cos(angle) * petal} ${Math.sin(angle) * petal}`;
  }).join(' ') + ' Z';
}

export default memo(CurrentChordIndicator);
