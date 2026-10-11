import React, { useEffect, useLayoutEffect, useState } from "react";
import RouteColors from "../RouteColors.jsx";
import { scrollChartSections } from "./data/sectionScroll.js";
import { pipeProgress } from './audio/pipeProgress.js';

export default function SectionPipe({ bridge, sectionsRef, playbackClockRef, autoScrollEnabled, fullHighlight = false }) {
  const [geometry, setGeometry] = useState(null);
  useLayoutEffect(() => {
    if (!autoScrollEnabled) return;
    const nodes = [...sectionsRef.current.querySelectorAll("[data-node-id]")];
    const source = nodes
      .find((node) => node.dataset.nodeId === bridge.sourceId)
      ?.closest(".chart-section");
    const destination = nodes
      .find((node) => node.dataset.nodeId === bridge.targetId)
      ?.closest(".chart-section");
    scrollChartSections(source, destination);
  }, [bridge, sectionsRef, autoScrollEnabled]);
  useEffect(() => {
    const findShape = (id) =>
      [...sectionsRef.current.querySelectorAll("[data-node-id]")]
        .find((node) => node.dataset.nodeId === id)
        ?.querySelector("[data-node-shape]");
    const source = findShape(bridge.sourceId),
      target = findShape(bridge.targetId);
    let frame;
    function measure() {
      if (source?.isConnected && target?.isConnected) {
        const a = source.getBoundingClientRect(),
          b = target.getBoundingClientRect();
        const from = { x: a.x + a.width / 2, y: a.y + a.height / 2 },
          to = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        const sourceInset = (Math.max(a.width, a.height) / 2) * 1.8 + 12;
        const targetInset = Math.max(b.width, b.height) / 2 + 12;
        if (distance > sourceInset + targetInset + 15) {
          const dx = (to.x - from.x) / distance,
            dy = (to.y - from.y) / distance;
          const start = {
            x: from.x + dx * sourceInset,
            y: from.y + dy * sourceInset,
          };
          const tip = {
            x: to.x - dx * targetInset,
            y: to.y - dy * targetInset,
          };
          const end = { x: tip.x - dx * 15, y: tip.y - dy * 15 };
          setGeometry({
            path: `M${start.x} ${start.y} L${end.x} ${end.y}`,
            route: `M${start.x} ${start.y} L${tip.x + dx * 6} ${tip.y + dy * 6}`,
          });
        } else setGeometry(null);
      }
      frame = requestAnimationFrame(measure);
    }
    measure();
    return () => cancelAnimationFrame(frame);
  }, [bridge, sectionsRef]);
  if (!geometry) return null;
  const fillProgress=fullHighlight ? 1 : pipeProgress(bridge.visitIndex,playbackClockRef?.current,bridge.seekVersion);
  return (
    <svg
      className="section-pipe-layer"
      data-highlight-target={bridge.targetId}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 500,
        overflow: "hidden",
      }}
    >
      <style>{`
      .section-pipe-fill { stroke-dasharray: 1; }
      .section-pipe-preview { stroke-dasharray: 1; animation: section-pipe-preview 200ms linear both; }
      @keyframes section-pipe-preview { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
      @media (prefers-reduced-motion: reduce) { .section-pipe-preview { animation: none; } }
    `}</style>
      <RouteColors fill="none">
        <path
          d={geometry.route}
          strokeWidth="1.5"
          data-fixed-color={bridge.color}
        />
      </RouteColors>
      <g fill="none" stroke={bridge.color} strokeLinecap="butt">
        <path className="section-pipe-preview" pathLength="1" d={geometry.path} strokeWidth="18" strokeOpacity=".24" />
        <path className="section-pipe-preview" pathLength="1" d={geometry.path} strokeWidth="6" strokeOpacity=".55" />
        <path
          className="section-pipe-fill"
          data-beat-base-width={fullHighlight ? 26 : 18}
          data-playback-pipe={bridge.visitIndex}
          data-turnaround-pipe={fullHighlight ? 'true' : undefined}
          data-pipe-seek-version={bridge.seekVersion}
          strokeDashoffset={1-fillProgress}
          d={geometry.path}
          pathLength="1"
          strokeWidth={fullHighlight ? 26 : 18}
          strokeOpacity={fullHighlight ? .65 : .45}
        />
        <path
          className="section-pipe-fill"
          data-playback-pipe={bridge.visitIndex}
          data-turnaround-pipe={fullHighlight ? 'true' : undefined}
          data-pipe-seek-version={bridge.seekVersion}
          strokeDashoffset={1-fillProgress}
          d={geometry.path}
          pathLength="1"
          strokeWidth="6"
        />
      </g>
    </svg>
  );
}
