import React, {
  useId,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
} from "react";
import RouteColors, {
  routePalette,
  colorRoutes,
  insetArrowShaft,
} from "../RouteColors.jsx";
import { positionNodeShapes } from "./data/chordShapes.js";
import { reciprocalRoutes } from "./data/reciprocalRoutes.js";
import {
  nodeVisits,
  nodeVisitColors,
  upcomingMovement,
  branchColors,
  rapidPassage,
  rapidPassageMovements,
  nearbyPlaybackNodes,
} from "./data/graphPresentation.js";
import StepBadge from "../StepBadge.jsx";
import BeatCountdownBadge from './BeatCountdownBadge.jsx';
import CurrentChordIndicator from "../CurrentChordIndicator.jsx";
import useArrowSafeLabels from "../useArrowSafeLabels.js";
import { routePath } from "./data/stringLayout.js";
import { chronologicalColors } from "./data/routePalette.js";
import { chordDisplayColors, chordQualityColor } from "./data/chordQualityColors.js";
import { pipeProgress, beatCountdown } from './audio/pipeProgress.js';
import {
  timelineColor,
  darkerTimelineColor,
} from "./data/timelinePresentation.js";
import {
  sectionViewport,
  sectionHeaderPositions,
} from "./data/sectionViewport.js";

const ink = "#073840";
const paper = "#fbf8ed";
const orange = "#c43b32";

const ordinal = (number) => {
  const remainder = number % 100;
  const suffix =
    remainder >= 11 && remainder <= 13
      ? "th"
      : { 1: "st", 2: "nd", 3: "rd" }[number % 10] || "th";
  return `${number}${suffix}`;
};

// Inlay positions repeat above the twelfth fret.
const fretDotCount = (fret) =>
  fret > 0 && fret % 12 === 0 ? 2 : [3, 5, 7, 9].includes(fret % 12) ? 1 : 0;

function Grid({ section: originalSection, darkMode, activeFret }) {
  const id = useId().replaceAll(":", "");
  const woodId = `wood-${id}`,
    grainId = `grain-${id}`,
    metalId = `metal-${id}`;
  const firstVisible = originalSection.frets.findIndex((fret) => fret >= 1);
  if (firstVisible < 0) return null;
  // The first boundary is the edge before fret 1, never a fret-zero column.
  const section =
    firstVisible === 0
      ? originalSection
      : {
          ...originalSection,
          left: originalSection.boundaries[firstVisible],
          frets: originalSection.frets.slice(firstVisible),
          centers: originalSection.centers.slice(firstVisible),
          boundaries: originalSection.boundaries.slice(firstVisible),
        };
  const width = section.right - section.left,
    height = section.bottom - section.top;
  return (
    <g>
      <defs>
        <linearGradient id={woodId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={darkMode ? "#49392c" : "#eed7ae"} />
          <stop offset=".5" stopColor={darkMode ? "#352b24" : "#f5e5c8"} />
          <stop offset="1" stopColor={darkMode ? "#453329" : "#dec195"} />
        </linearGradient>
        <pattern
          id={grainId}
          width="720"
          height="160"
          patternUnits="userSpaceOnUse"
        >
          <g
            fill="none"
            stroke={darkMode ? "#d4aa79" : "#966b3b"}
            strokeWidth="1.5"
            opacity={darkMode ? ".09" : ".13"}
          >
            {[12, 35, 68, 94, 128, 151].map((y, i) => (
              <path
                key={y}
                d={`M-20 ${y} C160 ${y - 10 - i * 2} 380 ${y + 12} 740 ${y - 3}`}
              />
            ))}
            <path d="M-20 80 C150 62 240 65 330 80 S560 97 740 80 M-20 84 C150 68 240 70 330 84 S560 100 740 84" />
          </g>
        </pattern>
        <linearGradient id={metalId}>
          <stop offset="0" stopColor="#7c8286" />
          <stop offset=".38" stopColor="#eef0e9" />
          <stop offset=".6" stopColor="#bbc0bd" />
          <stop offset="1" stopColor="#686f73" />
        </linearGradient>
      </defs>
      <rect
        x={section.left}
        y={section.top}
        width={width}
        height={height}
        rx="10"
        fill={`url(#${woodId})`}
        stroke={darkMode ? "#6b5140" : "#b99a70"}
        strokeWidth="3"
      />
      <rect
        x={section.left}
        y={section.top}
        width={width}
        height={height}
        rx="10"
        fill={`url(#${grainId})`}
      />
      {section.box && (
        <rect
          {...section.box}
          rx="20"
          fill="none"
          stroke="#a6beb5"
          strokeWidth="3"
        />
      )}
      <g aria-label="Metal frets">
        {section.boundaries.map((x) => (
          <g key={x}>
            <path
              d={`M${x + 3} ${section.top + 3} V${section.bottom - 3}`}
              stroke="#241f1b"
              opacity=".16"
              strokeWidth="12"
            />
            <rect
              x={x - 4}
              y={section.top}
              width="8"
              height={height}
              rx="3"
              fill={`url(#${metalId})`}
            />
          </g>
        ))}
      </g>
      <g aria-label="Wound guitar strings" fill="none">
        {section.rows.map((y, i) => {
          const thickness = 5 + i * 1.5;
          return (
            <g key={y}>
              <path
                d={`M${section.left} ${y + 3} H${section.right}`}
                stroke="#211b15"
                strokeWidth={thickness + 3}
                opacity=".2"
              />
              <path
                d={`M${section.left} ${y} H${section.right}`}
                stroke="#8b8474"
                strokeWidth={thickness}
              />
              <path
                d={`M${section.left} ${y - 1} H${section.right}`}
                stroke="#f1eedc"
                strokeWidth={thickness * 0.38}
              />
              <path
                d={`M${section.left} ${y} H${section.right}`}
                stroke="#59594f"
                strokeWidth={thickness}
                strokeDasharray="1 5"
                opacity=".35"
              />
            </g>
          );
        })}
      </g>
      <g
        fill={darkMode ? "#eee1c4" : "#6b513b"}
        opacity="0.65"
        aria-label="Fretboard position dots"
      >
        {section.frets.flatMap((fret, i) => {
          const count = fretDotCount(fret);
          const first = section.rows[0],
            last = section.rows.at(-1);
          const ys =
            count === 2
              ? [first + (last - first) / 3, first + (2 * (last - first)) / 3]
              : [(first + section.rows[1]) / 2];
          return count
            ? ys.map((y, j) => (
                <circle
                  key={`${fret}:${j}`}
                  data-fret-dot={fret}
                  cx={section.centers[i]}
                  cy={y}
                  r="16"
                />
              ))
            : [];
        })}
      </g>
      {section.frets.includes(activeFret) && (
        <rect
          data-fret-highlight="true"
          x={section.centers[section.frets.indexOf(activeFret)] - 105}
          y={section.fretY - 40}
          width="210"
          height="54"
          rx="14"
          fill="#e534ae"
          fillOpacity={darkMode ? ".24" : ".14"}
          stroke="#e534ae"
          strokeWidth="3"
        />
      )}
      <g
        fill={ink}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        textAnchor="middle"
        fontSize={section.fretFontSize || 35}
      >
        {section.frets.map((fret, i) => (
          <text
            data-fret-label={fret}
            fill={fret === activeFret ? "#e534ae" : undefined}
            aria-current={fret === activeFret ? "true" : undefined}
            aria-label={`Fret ${fret}`}
            key={fret}
            x={section.centers[i]}
            y={section.fretY}
            fontSize={(section.fretFontSize || 35) * 1.05}
            fontWeight="700"
          >{`${ordinal(fret)} fret`}</text>
        ))}
      </g>
      <g
        fill={darkMode ? "#eee1c4" : "#6b513b"}
        opacity="0.7"
        aria-label="Fret label position dots"
      >
        {section.frets.flatMap((fret, i) => {
          const count = fretDotCount(fret);
          return Array.from({ length: count }, (_, j) => (
            <circle
              key={`${fret}:${j}`}
              cx={section.centers[i] + (j - (count - 1) / 2) * 36}
              cy={section.fretY + 38}
              r="12"
            />
          ));
        })}
      </g>
      <g
        fill={ink}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        textAnchor="end"
        dominantBaseline="middle"
        fontSize={section.stringFontSize || 34}
      >
        {section.rows.map((y, i) => (
          <text key={y} x={section.left - 20} y={y}>
            {section.stringLabels[i]}
          </text>
        ))}
      </g>
      {originalSection.frets.includes(0) && <text
        x={originalSection.centers[originalSection.frets.indexOf(0)]}
        y={section.fretY} textAnchor="middle" fontSize={section.fretFontSize || 35}
        fill={activeFret === 0 ? '#e534ae' : ink} fontWeight="700"
      >Open</text>}
    </g>
  );
}

function ChordNode({
  node,
  visits,
  type,
  compactBadge,
  color,
  nextColor,
  currentColor,
  darkMode,
  isPlaying,
  visitIndex,
  playbackClockRef,
  hidden,
}) {
  const shineId = `next-shine-${useId().replaceAll(":", "")}`;
  const beatPulseRef = useRef(null);
  useEffect(() => {
    if (!isPlaying || !(currentColor || nextColor)) return;
    let frame;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function update() {
      const { phase } = beatCountdown(playbackClockRef?.current);
      const scale = reduced ? 1 : 1 + .12 * Math.exp(-phase * 8);
      beatPulseRef.current?.setAttribute('transform', `translate(${node.x} ${node.y}) scale(${scale}) translate(${-node.x} ${-node.y})`);
      frame = requestAnimationFrame(update);
    }
    update();
    return () => {
      cancelAnimationFrame(frame);
      beatPulseRef.current?.removeAttribute('transform');
    };
  }, [isPlaying, currentColor, nextColor, playbackClockRef, node.x, node.y]);
  const baseRadius = node.radius || Math.min(node.width, node.height) / 2 || 46;
  const r = baseRadius * (type === "triangle" || type === "square" ? 1.15 : 1);
  const solidColor = currentColor || nextColor;
  const nextBorderColor = nextColor && darkerTimelineColor(nextColor);
  const shinyBorderColor = solidColor && darkerTimelineColor(solidColor);
  const common = {
    "data-node-shape": true,
    fill: paper,
    stroke: nextBorderColor || solidColor || color || ink,
    strokeWidth: solidColor ? 6 : node.strokeWidth || 4,
  };
  const vertices =
    type === "triangle"
      ? [
          [0, -r],
          [(Math.sqrt(3) * r) / 2, r / 2],
          [(-Math.sqrt(3) * r) / 2, r / 2],
        ]
      : Array.from({ length: 6 }, (_, i) => [
          Math.cos((i * Math.PI) / 3) * r,
          Math.sin((i * Math.PI) / 3) * r,
        ]);
  const labelY =
    type === "triangle" ? node.y + r * 0.15 : node.y + (node.textOffset ?? 4);
  const shape =
    type === "circle" ? (
      <circle {...common} cx={node.x} cy={node.y} r={r} />
    ) : type === "square" ? (
      <rect
        {...common}
        x={node.x - r / Math.sqrt(2)}
        y={node.y - r / Math.sqrt(2)}
        width={r * Math.sqrt(2)}
        height={r * Math.sqrt(2)}
        rx="5"
      />
    ) : (
      <polygon
        {...common}
        points={vertices
          .map(([x, y]) => `${node.x + x},${node.y + y}`)
          .join(" ")}
      />
    );
  return (
    <g
      data-node-id={node.id}
      data-next-node={nextColor ? 'true' : undefined}
      data-root={node.root}
      data-fret={node.fret}
      data-string={node.string}
      data-chord={node.chord}
      data-quality-shape={type}
      opacity={hidden ? 0 : undefined}
      pointerEvents={hidden ? 'none' : undefined}
      aria-hidden={hidden || undefined}
    >
      <g ref={beatPulseRef}>
      {solidColor && (
        <g
          className="next-chord-cue"
          aria-label={`${currentColor ? "Current" : "Next"} ${node.kind || 'chord'}: ${node.chord}`}
          style={{ color: solidColor }}
          pointerEvents="none"
        >
          <defs>
            <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={shinyBorderColor} />
              <stop offset=".25" stopColor={solidColor} />
              <stop offset=".43" stopColor="#ffffff" />
              <stop offset=".57" stopColor={solidColor} />
              <stop offset=".8" stopColor={shinyBorderColor} />
              <stop offset="1" stopColor={solidColor} />
            </linearGradient>
          </defs>
          {React.cloneElement(shape, {
            "data-node-shape": undefined,
            fill: "none",
            stroke: `url(#${shineId})`,
            strokeWidth: 5,
            strokeLinejoin: "round",
            transform: `translate(${node.x} ${node.y}) scale(1.12) translate(${-node.x} ${-node.y})`,
          })}
        </g>
      )}
      {shape}
      {solidColor && (
        <g pointerEvents="none" aria-hidden="true">
          <g className="node-fill-fade">
            {React.cloneElement(shape, {
              "data-node-shape": undefined,
              fill: solidColor,
              stroke: "none",
            })}
          </g>
        </g>
      )}
      <text
        className="node-chord-label"
        x={node.x}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={solidColor ? (darkMode ? ink : "#ffffff") : color || ink}
        style={solidColor ? { fill: darkMode ? ink : "#ffffff" } : undefined}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        fontSize={Math.min(
          node.fontSize || 35,
          r * (type === "triangle" ? 0.62 : 0.72),
        )}
        fontWeight="700"
      >
        {node.chord}
      </text>
      </g>
      {solidColor && isPlaying ? <BeatCountdownBadge
        numberOnly={!currentColor}
        x={node.x}
        y={node.y-r-80}
        color={solidColor}
        darkMode={darkMode}
        visitIndex={visitIndex}
        playbackClockRef={playbackClockRef}
      /> : <StepBadge
        x={node.x}
        y={
          compactBadge
            ? node.y - r - 25
            : node.y +
              ((node.badgeOffset ?? -baseRadius - 20) - (r - baseRadius))
        }
        step={visits.length ? visits : node.step}
        color={color || node.badgeColor || orange}
      />}
    </g>
  );
}

export function directEdgePath(edge, nodes) {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  if (!source || !target) return null;
  const dx = target.x - source.x,
    dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  if (!length) return null;
  const extent = (node) =>
    node.shape === "rect"
      ? Math.min(
          dx ? ((node.width / 2) * length) / Math.abs(dx) : Infinity,
          dy ? ((node.height / 2) * length) / Math.abs(dy) : Infinity,
        )
      : node.radius || 46;
  const start = extent(source) + 9,
    end = extent(target) + 9;
  return `M${source.x + (dx / length) * start} ${source.y + (dy / length) * start} L${target.x - (dx / length) * end} ${target.y - (dy / length) * end}`;
}

function chartPaths(song) {
  return Object.fromEntries(
    song.edges.map((edge) => {
      const section = song.layout.sections.find(
        (section) => section.id === edge.section,
      );
      const source = song.nodes.find((node) => node.id === edge.source),
        target = song.nodes.find((node) => node.id === edge.target);
      return [
        edge.id,
        source && target
          ? routePath(
              source,
              target,
              song.nodes.filter((node) => node.section === edge.section),
              section,
              song.kind !== 'notes',
            ) || directEdgePath(edge, song.nodes)
          : edge.path,
      ];
    }),
  );
}

// Use the same geometry and coloring decisions for graph arrows and transport labels.
export function outgoingVisitColors(song) {
  const branches = Object.assign(
    {},
    ...song.layout.sections.map((section) =>
      branchColors(song, section, section.palette || routePalette),
    ),
  );
  const paths = chartPaths(song);
  const reciprocal = Object.assign(
    {},
    ...song.layout.sections.map((section) =>
      reciprocalRoutes(
        song,
        section,
        section.palette || routePalette,
        paths,
        branches,
      ),
    ),
  );
  const colors = {};
  for (const section of song.layout.sections) {
    const edges = song.edges.filter(
      (edge) =>
        edge.section === section.id &&
        (reciprocal[edge.id]?.path || paths[edge.id]),
    );
    const resolved = colorRoutes(
      edges.map((edge) => ({
        d: reciprocal[edge.id]?.path || paths[edge.id],
        fixed: reciprocal[edge.id]?.color || branches[edge.id],
        preferred:
          reciprocal[edge.id]?.color ||
          branches[edge.id] ||
          edge.preferredColor ||
          (edge.passNumber === 2 ? "#8b4695" : section.color || orange),
        palette: section.palette,
      })),
    );
    edges.forEach((edge, i) => {
      colors[edge.id] = resolved[i];
    });
  }
  return chronologicalColors(
    song.playback.map((event, i) => {
      const next = song.playback
        .slice(i + 1)
        .find((item) => item.nodeId !== event.nodeId);
      const edge = song.edges.find(
        (edge) => edge.source === event.nodeId && edge.target === next?.nodeId,
      );
      return (
        colors[edge?.id] ||
        song.layout.sections.find(
          (section) =>
            section.id ===
            song.nodes.find((node) => node.id === event.nodeId)?.section,
        )?.color ||
        orange
      );
    }),
  );
}

const SongChart = forwardRef(function SongChart(
  {
    song,
    currentChord,
    onIndicatorArrival,
    playbackClockRef,
    playbackVisitIndex = currentChord?.visitIndex,
    playbackIsPlaying = currentChord?.isPlaying,
    darkMode = false,
    hideGuidingLines = false,
    hideOtherNodes = false,
    suppressIndicator = false,
    sectionId,
    showStartMarker = true,
    visiblePlaybackSteps = 3,
  },
  forwardedRef,
) {
  const id = useId();
  const svgRef = useArrowSafeLabels();
  useImperativeHandle(forwardedRef, () => svgRef.current);
  const { layout } = song;
  const sections = sectionId
    ? layout.sections.filter((section) => section.id === sectionId)
    : layout.sections;
  const nearbyNodes = hideOtherNodes ? nearbyPlaybackNodes(song, playbackVisitIndex, visiblePlaybackSteps) : null;
  // Keep hidden node geometry mounted for the indicator and section pipes.
  const visibleNodes = song.nodes.filter(node => !sectionId || node.section === sectionId);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const viewBox = sectionId ? sectionViewport(song, sectionId) : layout.viewBox;
  const [viewX, viewY, viewWidth, viewHeight] = viewBox.split(" ").map(Number);
  const showStart =
    showStartMarker && (!sectionId || visibleIds.has(song.startNodeId));
  const width = Number(layout.viewBox.split(" ")[2]);
  const byId = Object.fromEntries(song.nodes.map((node) => [node.id, node]));
  const startNode = showStart ? byId[song.startNodeId] : null;
  const startRadius = startNode ? (startNode.radius || Math.min(startNode.width, startNode.height) / 2 || 46) * (["triangle", "square"].includes(positionNodeShapes(song)[startNode.id]) ? 1.15 : 1) : 0;
  const startMarkerY = startNode ? startNode.y + startRadius + 31 : 0;
  const visits = nodeVisits(song);
  const shapes = positionNodeShapes(song);
  const branchColorById = useMemo(() => Object.assign(
    {},
    ...layout.sections.map((section) =>
      branchColors(song, section, section.palette || routePalette),
    ),
  ), [song]);
  const paths = useMemo(() => chartPaths(song), [song]);
  const reciprocal = useMemo(() => Object.assign(
    {},
    ...layout.sections.map((section) =>
      reciprocalRoutes(
        song,
        section,
        section.palette || routePalette,
        paths,
        branchColorById,
      ),
    ),
  ), [song, paths, branchColorById]);
  const visitColors = useMemo(() => outgoingVisitColors(song), [song]);
  const displayColors = chordDisplayColors(song, visitColors);
  const nodeColors = nodeVisitColors(song, displayColors, playbackVisitIndex);
  if (song.nodeColorMode === 'quality') {
    for (const node of song.nodes) nodeColors[node.id] = timelineColor(nodeColors[node.id] || chordQualityColor(node.chord), darkMode);
  }
  const upcoming = upcomingMovement(song, playbackVisitIndex);
  const [arrivedTarget, setArrivedTarget] = useState(null);
  const handleArrival = useCallback(
    (target) => {
      setArrivedTarget(target);
      if (target) onIndicatorArrival?.(target);
    },
    [onIndicatorArrival],
  );
  const indicatorArrived =
    !suppressIndicator &&
    currentChord &&
    arrivedTarget?.node === currentChord.node &&
    arrivedTarget?.visitIndex === currentChord.visitIndex &&
    arrivedTarget?.seekVersion === currentChord.seekVersion;
  const inTransit =
    !suppressIndicator &&
    currentChord &&
    arrivedTarget &&
    currentChord.visitIndex === arrivedTarget.visitIndex + 1 &&
    currentChord.seekVersion === arrivedTarget.seekVersion;
  const highlightedMovement = indicatorArrived
    ? upcoming
    : inTransit
      ? upcomingMovement(song, arrivedTarget.visitIndex)
      : null;
  const highlightedEdgeId = highlightedMovement?.edgeId;
  const highlightedVisitIndex = indicatorArrived
    ? playbackVisitIndex
    : arrivedTarget?.visitIndex;
  const highlightedSeekVersion = indicatorArrived ? currentChord?.seekVersion : arrivedTarget?.seekVersion;
  const rapid = rapidPassage(song, playbackVisitIndex);
  const fillProgress = rapid ? 1 : pipeProgress(highlightedVisitIndex, playbackClockRef?.current, highlightedSeekVersion);
  const rapidPipes = rapidPassageMovements(song, playbackVisitIndex).flatMap(movement => {
    const edge = song.edges.find(edge => edge.id === movement.edgeId && sections.some(section => section.id === edge.section));
    const original = edge && (reciprocal[edge.id]?.path || paths[edge.id]);
    if (!original || (nearbyNodes && (!nearbyNodes.has(edge.source) || !nearbyNodes.has(edge.target)))) return [];
    return [{ edgeId: edge.id, path: insetArrowShaft(original, 21 + (["triangle", "square"].includes(shapes[edge.target]) ? 8 : 0)), color: song.nodeColorMode === 'quality' ? nodeColors[edge.target] : timelineColor(displayColors[movement.sourceVisitIndex], darkMode) }];
  });
  const highlightedEdge = song.edges.find(
    (edge) =>
      edge.id === highlightedEdgeId &&
      sections.some((section) => section.id === edge.section),
  );
  const highlightedOriginalPath =
    highlightedEdge &&
    (reciprocal[highlightedEdge.id]?.path || paths[highlightedEdge.id]);
  const highlightedPath =
    highlightedOriginalPath &&
    insetArrowShaft(
      highlightedOriginalPath,
      21 +
        (["triangle", "square"].includes(shapes[highlightedEdge.target])
          ? 8
          : 0),
    );
  const highlightedColor = song.nodeColorMode === 'quality' && highlightedEdge
    ? nodeColors[highlightedEdge.target]
    : timelineColor(
    displayColors[highlightedVisitIndex],
    darkMode,
  );
  const edgeVisitColors = {};
  song.playback.forEach((event, i) => {
    const next = song.playback
      .slice(i + 1)
      .find((item) => item.nodeId !== event.nodeId);
    const edge = song.edges.find(
      (edge) => edge.source === event.nodeId && edge.target === next?.nodeId,
    );
    if (
      edge &&
      (!edgeVisitColors[edge.id] || i <= (currentChord?.visitIndex ?? -1))
    )
      edgeVisitColors[edge.id] = song.nodeColorMode === 'quality' ? nodeColors[edge.target] : visitColors[i];
  });
  const followIndicator = useCallback(
    (position, progress, fromId, toId) => {
      const highlight = svgRef.current?.querySelector("[data-fret-highlight]");
      if (!position || !highlight) return;
      const to = song.nodes.find((node) => node.id === toId);
      const from = song.nodes.find((node) => node.id === fromId) || to;
      const offset = (node) => {
        const section = song.layout.sections.find(
          (section) => section.id === node?.section,
        );
        return section
          ? section.centers[section.frets.indexOf(node.fret)] - node.x
          : 0;
      };
      highlight.setAttribute(
        "x",
        position.x +
          offset(from) * (1 - progress) +
          offset(to) * progress -
          105,
      );
    },
    [song, svgRef],
  );
  const current =
    currentChord && (!sectionId || visibleIds.has(currentChord.node))
      ? currentChord
      : null;
  return (
    <svg
      data-section-id={sectionId}
      className={darkMode ? "dark-chord-chart" : undefined}
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <style>{`
      .next-chord-cue { opacity: 1; filter: drop-shadow(0 0 6px currentColor); animation: next-chord-breathe 1.4s ease-in-out infinite; }
      .playback-route { transition: stroke-width 300ms ease-out; }
      .node-fill-fade { animation: node-fill-fade 350ms ease-out both; }
      .node-chord-label { transition: fill 350ms ease-out; }
      @keyframes node-fill-fade { from { opacity: 0; } to { opacity: 1; } }
      .route-pipe-fill { stroke-dasharray: 1; }
      .pipe-preview-fill { stroke-dasharray: 1; animation: pipe-preview-fill 200ms linear both; }
      @keyframes pipe-preview-fill { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
      .route-pipe-core { filter: drop-shadow(0 0 5px currentColor); }
      @keyframes next-chord-breathe { 50% { filter: drop-shadow(0 0 10px currentColor); } }
      @media (prefers-reduced-motion: reduce) { .next-chord-cue, .route-pipe-fill, .pipe-preview-fill, .node-fill-fade { animation: none; } .playback-route, .node-chord-label { transition: none; } }
    `}</style>
      {darkMode && (
        <style>{`
      .dark-chord-chart [fill="#fbf8ed"] { fill: #192427; }
      .dark-chord-chart [stroke="#fbf8ed"] { stroke: #192427; }
      .dark-chord-chart [fill="#073840"] { fill: #e3f1ed; }
      .dark-chord-chart [stroke="#073840"] { stroke: #d6e8e3; }
      .dark-chord-chart [fill="#62736d"] { fill: #a5bbb4; }
      .dark-chord-chart [stroke="#45888a"] { stroke: #476e72; }
      .dark-chord-chart [stroke="#a6beb5"] { stroke: #3b5152; }
      ${Object.entries({
        "#c43b32": "#ff8278",
        "#cc480e": "#ffa263",
        "#267b99": "#70d8ef",
        "#8b4695": "#d8a2ee",
        "#29805d": "#83d7ae",
        "#a06a16": "#e5bd70",
        "#be3d6a": "#f38eae",
        "#485aa3": "#a3b1ff",
        "#576b24": "#bbcf81",
      })
        .map(
          ([from, to]) =>
            `.dark-chord-chart [stroke="${from}"] { stroke: ${to}; } .dark-chord-chart [fill="${from}"] { fill: ${to}; }`,
        )
        .join("\n")}
      .dark-chord-chart [aria-label="Current chord"] > g > rect:first-child,
      .dark-chord-chart [aria-label="Starting chord"] > g > rect:first-child { stroke: #d6e8e3; }
    `}</style>
      )}
      <title
        id={`${id}-title`}
      >{`${song.title} — chord path in ${song.key}`}</title>
      <desc id={`${id}-desc`}>{song.description}</desc>
      <rect
        x={viewX}
        y={viewY}
        width={viewWidth}
        height={viewHeight}
        fill={paper}
      />
      {!sectionId && (
        <g
          fill={ink}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          textAnchor="middle"
        >
          <text
            x={width / 2}
            y="110"
            fontSize={layout.titleSize || 94}
            fontWeight="700"
          >
            {song.title}
          </text>
          <text x={width / 2} y="177" fontSize={layout.subtitleSize || 43}>
            {layout.subtitle}
          </text>
        </g>
      )}
      {sections.map((section) => (
        <Grid
          key={section.id}
          section={{ ...section, ...sectionHeaderPositions(song, section.id) }}
          darkMode={darkMode}
          activeFret={current ? byId[current.node]?.fret : undefined}
        />
      ))}
      <CurrentChordIndicator
        itemName={song.kind === 'notes' ? 'note' : 'chord'}
        onMotion={followIndicator}
        onArrival={handleArrival}
        directMotion={hideGuidingLines}
        svgRef={svgRef}
        target={suppressIndicator ? null : current}
        initial={null}
      />
      <g
        opacity={hideGuidingLines ? 0 : 1}
        pointerEvents={hideGuidingLines ? "none" : undefined}
        aria-hidden={hideGuidingLines || undefined}
      >
        {sections.map((section) => (
          <RouteColors
            key={section.id}
            palette={section.palette}
            distinguishPasses
            preferredColor={section.color || orange}
            fill="none"
            strokeWidth="6"
            strokeLinejoin="round"
          >
            {song.edges
              .filter((edge) => edge.section === section.id && (!nearbyNodes || (nearbyNodes.has(edge.source) && nearbyNodes.has(edge.target))))
              .map((edge) => {
                const qualityColor = song.nodeColorMode === 'quality' ? nodeColors[edge.target] : undefined;
                const originalPath =
                  reciprocal[edge.id]?.path || paths[edge.id];
                const largerTarget = ["triangle", "square"].includes(
                  shapes[edge.target],
                );
                const path =
                  originalPath && largerTarget
                    ? insetArrowShaft(originalPath, 8)
                    : originalPath;
                return (
                  path && (
                    <g
                      key={edge.id}
                      data-source={edge.source}
                      data-target={edge.target}
                    >
                      <path d={path} stroke={paper} strokeWidth="15" />
                      <path
                        d={path}
                        className="playback-route"
                        strokeWidth={
                          Number.isInteger(playbackVisitIndex)
                            ? Math.min(edge.width || 6, 1.5)
                            : edge.width || 6
                        }
                        data-fixed-color={
                          qualityColor || edgeVisitColors[edge.id] ||
                          reciprocal[edge.id]?.color ||
                          branchColorById[edge.id]
                        }
                        stroke={
                          qualityColor || edgeVisitColors[edge.id] ||
                          reciprocal[edge.id]?.color ||
                          branchColorById[edge.id] ||
                          edge.preferredColor
                        }
                        strokeDasharray={
                          edge.passNumber === 2 ? "3 6" : undefined
                        }
                      />
                    </g>
                  )
                );
              })}
          </RouteColors>
        ))}
        {rapidPipes.filter(pipe => !highlightedPath || pipe.edgeId !== highlightedEdgeId).map(pipe => (
          <g key={`rapid:${rapid.start}:${pipe.edgeId}`} data-highlight-target={song.edges.find(edge => edge.id === pipe.edgeId)?.target} fill="none" stroke={pipe.color} pointerEvents="none" aria-hidden="true">
            <path className="turnaround-pipe" d={pipe.path} strokeWidth="26" strokeOpacity=".65" strokeLinejoin="round" />
            <path className="turnaround-pipe" d={pipe.path} strokeWidth="6" strokeLinejoin="round" />
          </g>
        ))}
        {highlightedPath && (
          <g
            key={`${highlightedEdgeId}:${highlightedVisitIndex}`}
            data-highlight-target={highlightedEdge?.target}
            fill="none"
            stroke={highlightedColor}
            style={{ color: highlightedColor }}
            pointerEvents="none"
            aria-hidden="true"
          >
            <path className="pipe-preview-fill" pathLength="1" d={highlightedPath} strokeWidth="18" strokeOpacity=".24" strokeLinecap="butt" strokeLinejoin="round" />
            <path className="pipe-preview-fill" pathLength="1" d={highlightedPath} strokeWidth="6" strokeOpacity=".55" strokeLinecap="butt" strokeLinejoin="round" />
            <path
              className="route-pipe-fill"
              data-beat-base-width={rapid ? 26 : 18}
              data-playback-pipe={highlightedVisitIndex}
              data-turnaround-pipe={rapid ? 'true' : undefined}
              data-pipe-seek-version={highlightedSeekVersion}
              strokeDashoffset={1-fillProgress}
              d={highlightedPath}
              pathLength="1"
              strokeWidth={rapid ? 26 : 18}
              strokeOpacity={rapid ? .65 : .45}
              strokeLinecap="butt"
              strokeLinejoin="round"
            />
            <path
              className="route-pipe-fill route-pipe-core"
              data-playback-pipe={highlightedVisitIndex}
              data-turnaround-pipe={rapid ? 'true' : undefined}
              data-pipe-seek-version={highlightedSeekVersion}
              strokeDashoffset={1-fillProgress}
              d={highlightedPath}
              pathLength="1"
              strokeWidth="6"
              strokeLinecap="butt"
              strokeLinejoin="round"
            />
          </g>
        )}
      </g>
      {startNode && <g className="starting-chord-beacon" pointerEvents="none" aria-hidden="true" style={{ transformOrigin: `${startNode.x}px ${startNode.y}px` }}>
        <circle cx={startNode.x} cy={startNode.y} r={startRadius + 14} fill="none" stroke="#ffd45c" strokeWidth="8" />
        <circle cx={startNode.x} cy={startNode.y} r={startRadius + 25} fill="none" stroke="#ffd45c" strokeWidth="3" strokeDasharray="8 8" />
      </g>}
      {visibleNodes.map((node) => (
        <ChordNode
          key={node.id}
          node={node}
          hidden={Boolean(nearbyNodes && !nearbyNodes.has(node.id))}
          visits={visits[node.id]}
          type={shapes[node.id]}
          compactBadge={hideGuidingLines}
          isPlaying={playbackIsPlaying}
          visitIndex={playbackVisitIndex}
          playbackClockRef={playbackClockRef}
          darkMode={darkMode}
          color={nodeColors[node.id]}
          currentColor={
            (current?.node === node.id || (current && song.playback[playbackVisitIndex]?.nodeIds?.includes(node.id)))
              ? timelineColor(displayColors[playbackVisitIndex], darkMode)
              : undefined
          }
          nextColor={
            (upcoming?.nodeId === node.id || song.playback[playbackVisitIndex + 1]?.nodeIds?.includes(node.id))
              ? timelineColor(displayColors[playbackVisitIndex + 1], darkMode)
              : undefined
          }
        />
      ))}
      {startNode && (
        <g data-chart-label="true" data-start-node={startNode.id} aria-label="Starting chord label">
          <rect
            x={startNode.x - 100}
            y={startMarkerY - 24}
            width="200"
            height="44"
            rx="9"
            fill="#ffd45c"
            stroke={paper}
            strokeWidth="3"
          />
          <text
            x={startNode.x}
            y={startMarkerY + 5}
            textAnchor="middle"
            fill="#28200c"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
            fontSize="25"
            fontWeight="900"
          >
            ▶ START
          </text>
        </g>
      )}
      {!sectionId &&
        layout.annotations?.map((label, i) => (
          <text
            key={i}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor}
            fill={ink}
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
            fontSize="24"
          >
            {label.text}
          </text>
        ))}
      {!sectionId && layout.legend && (
        <>
          <RouteColors distinguishPasses fill="none" strokeWidth="6">
            {layout.legend.map((label) => (
              <path
                key={label.label}
                d={`M${label.x} ${label.y} H${label.x + 105}`}
                strokeDasharray={label.passNumber === 2 ? "3 6" : undefined}
              />
            ))}
          </RouteColors>
          {layout.legend.map((label) => (
            <text
              key={label.label}
              x={label.labelX}
              y={label.y + 10}
              fill={ink}
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
              fontSize="31"
            >
              {label.label}
            </text>
          ))}
        </>
      )}
      {!sectionId && (
        <text
          x={width / 2}
          y={layout.footerY}
          textAnchor="middle"
          fill={ink}
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
          fontSize={layout.footerSize || 25}
        >
          {layout.footer}
        </text>
      )}
    </svg>
  );
});

export default SongChart;
