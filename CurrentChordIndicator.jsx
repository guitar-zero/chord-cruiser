import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { pointAlongRoute } from "./src/data/motion.js";

const center = (box) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
});

export default function CurrentChordIndicator({
  svgRef,
  target,
  initial,
  directMotion = false,
  onMotion,
  onArrival,
}) {
  const [box, setBox] = useState(initial);
  const previous = useRef(null);
  const displayed = useRef(initial);
  const [viewport, setViewport] = useState(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !target) return;
    const measure = () => {
      const bounds = svg.getBoundingClientRect();
      setViewport({
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        viewBox: svg.getAttribute("viewBox"),
      });
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
      setBox(value);
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
    let frame, started;
    function animate(time) {
      started ??= time;
      const progress = Math.min(1, (time - started) / 220);
      const eased = progress * progress * (3 - 2 * progress);
      const position = pointAlongRoute(points, eased);
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
      else onArrival?.(target);
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
  if (!box || !target || !viewport) return null;
  const { x, y, width, height } = box;
  const radius = Math.max(width, height) / 2 + 23;
  const flower =
    Array.from({ length: 193 }, (_, i) => {
      const angle = (i / 192) * Math.PI * 2;
      const petal = radius + 8 * Math.cos(angle * 8);
      return `${i ? "L" : "M"}${Math.cos(angle) * petal} ${Math.sin(angle) * petal}`;
    }).join(" ") + " Z";
  return createPortal(
    <svg
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
        zIndex: 1200,
      }}
    >
      <g
        aria-label={target ? "Current chord" : "Starting chord"}
        pointerEvents="none"
      >
        <style>{`
      .chord-flower-spin { filter: drop-shadow(0 3px 5px #c91b9855); transform-origin: 0 0; animation: chord-flower-turn 9s linear infinite; }
      @keyframes chord-flower-turn { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .chord-flower-spin { animation: none; } }
    `}</style>
        <g transform={`translate(${x + width / 2} ${y + height / 2})`}>
          <g className={target ? "chord-flower-spin" : undefined}>
            <path
              d={flower}
              fill="#e534ae"
              fillOpacity=".09"
              stroke="#e534ae"
              strokeWidth="20"
              strokeOpacity=".18"
            />
            <path
              d={flower}
              fill="none"
              stroke="#e534ae"
              strokeWidth="6"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </g>
    </svg>,
    document.body,
  );
}
