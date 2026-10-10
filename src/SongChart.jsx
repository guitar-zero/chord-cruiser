import React, { useId, useImperativeHandle, forwardRef } from 'react';
import RouteColors, { routePalette } from '../RouteColors.jsx';
import { reciprocalRoutes } from './data/reciprocalRoutes.js';
import { songNodeShapes } from './data/chordShapes.js';
import { nodeVisits, branchColors } from './data/graphPresentation.js';
import StepBadge from '../StepBadge.jsx';
import DurationLabel from '../DurationLabel.jsx';
import CurrentChordIndicator from '../CurrentChordIndicator.jsx';
import useArrowSafeLabels from '../useArrowSafeLabels.js';
import { sectionViewport } from './data/sectionViewport.js';

const ink = '#073840';
const paper = '#fbf8ed';
const orange = '#cc480e';

function Grid({ section }) {
  return <g>
    {section.box && <rect {...section.box} rx="20" fill="none" stroke="#a6beb5" strokeWidth="3" />}
    {section.title && <text x={section.left + (section.right - section.left) / 2} y={section.titleY || 286} textAnchor="middle" fill={section.color || ink} fontFamily="Georgia, serif" fontSize={section.titleSize || 43} fontWeight="700">{section.title}</text>}
    <g stroke={section.gridColor || '#45888a'} strokeWidth={section.gridWidth || 3} fill="none">
      {section.boundaries.map(x => <path key={x} d={`M${x} ${section.top} V${section.bottom}`} />)}
      {section.rows.map(y => <path key={y} d={`M${section.left} ${y} H${section.right}`} />)}
    </g>
    <g fill={ink} fontFamily="Georgia, serif" textAnchor="middle" fontSize={section.fretFontSize || 35}>
      {section.frets.map((fret, i) => <text data-fret-label={fret} aria-label={`Fret ${fret}`} key={fret} x={section.centers[i]} y={section.fretY} fontSize={section.fretFontSize ? section.fretFontSize * .75 : 27}>Fret {fret}</text>)}
    </g>
    <g fill={ink} fontFamily="Georgia, serif" textAnchor="end" dominantBaseline="middle" fontSize={section.stringFontSize || 34}>
      {section.rows.map((y, i) => <text key={y} x={section.left - 20} y={y}>{section.stringLabels[i]}</text>)}
    </g>
  </g>;
}

function ChordNode({ node, visits, type }) {
  // Inscribed shapes preserve the existing route clearance and root centers.
  const r = node.radius || Math.min(node.width, node.height) / 2 || 46;
  const common = { 'data-node-shape': true, fill: paper, stroke: ink, strokeWidth: node.strokeWidth || 4 };
  const vertices = type === 'triangle'
    ? [[0, -r], [Math.sqrt(3) * r / 2, r / 2], [-Math.sqrt(3) * r / 2, r / 2]]
    : Array.from({ length: 6 }, (_, i) => [Math.cos(i * Math.PI / 3) * r, Math.sin(i * Math.PI / 3) * r]);
  const labelY = type === 'triangle' ? node.y + r * .15 : node.y + (node.textOffset ?? 4);
  return <g data-node-id={node.id} data-root={node.root} data-fret={node.fret} data-string={node.string} data-chord={node.chord} data-quality-shape={type}>
    {type === 'circle' ? <circle {...common} cx={node.x} cy={node.y} r={r} />
      : type === 'square' ? <rect {...common} x={node.x - r / Math.sqrt(2)} y={node.y - r / Math.sqrt(2)} width={r * Math.sqrt(2)} height={r * Math.sqrt(2)} rx="5" />
      : <polygon {...common} points={vertices.map(([x,y]) => `${node.x + x},${node.y + y}`).join(' ')} />}
    <text x={node.x} y={labelY} textAnchor="middle" dominantBaseline="middle" fill={ink} fontFamily="Georgia, serif" fontSize={Math.min(node.fontSize || 35, r * (type === 'triangle' ? .62 : .72))} fontWeight="700">{node.chord}</text>
    <StepBadge x={node.x} y={node.y + (node.badgeOffset ?? -r - 20)} step={visits.length ? visits : node.step} color={node.badgeColor || orange} />
  </g>;
}

export function directEdgePath(edge, nodes) {
  const source = nodes.find(node => node.id === edge.source);
  const target = nodes.find(node => node.id === edge.target);
  if (!source || !target) return null;
  const dx = target.x - source.x, dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  if (!length) return null;
  const extent = node => node.shape === 'rect'
    ? Math.min(dx ? node.width / 2 * length / Math.abs(dx) : Infinity, dy ? node.height / 2 * length / Math.abs(dy) : Infinity)
    : node.radius || 46;
  const start = extent(source) + 9, end = extent(target) + 9;
  return `M${source.x + dx / length * start} ${source.y + dy / length * start} L${target.x - dx / length * end} ${target.y - dy / length * end}`;
}

const SongChart = forwardRef(function SongChart({ song, currentChord, darkMode = false, sectionId, showStartMarker = true }, forwardedRef) {
  const id = useId();
  const svgRef = useArrowSafeLabels();
  useImperativeHandle(forwardedRef, () => svgRef.current);
  const { layout } = song;
  const sections = sectionId ? layout.sections.filter(section => section.id === sectionId) : layout.sections;
  const visibleNodes = sectionId ? song.nodes.filter(node => node.section === sectionId) : song.nodes;
  const visibleIds = new Set(visibleNodes.map(node => node.id));
  const viewBox = sectionId ? sectionViewport(song, sectionId) : layout.viewBox;
  const [viewX, viewY, viewWidth, viewHeight] = viewBox.split(' ').map(Number);
  const showStart = showStartMarker && (!sectionId || visibleIds.has(song.startNodeId));
  const width = Number(layout.viewBox.split(' ')[2]);
  const byId = Object.fromEntries(song.nodes.map(node => [node.id, node]));
  const visits = nodeVisits(song);
  const shapes = songNodeShapes(song);
  const branchColorById = Object.assign({}, ...layout.sections.map(section => branchColors(song, section, section.palette || routePalette)));
  const paths = Object.fromEntries(song.edges.map(edge => [edge.id, edge.path || directEdgePath(edge, song.nodes)]));
  const reciprocal = Object.assign({}, ...layout.sections.map(section => reciprocalRoutes(song, section, section.palette || routePalette, paths, branchColorById)));
  const current = currentChord && (!sectionId || visibleIds.has(currentChord.node)) ? currentChord : null;
  return <svg data-section-id={sectionId} className={darkMode ? 'dark-chord-chart' : undefined} ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
    {darkMode && <style>{`
      .dark-chord-chart [fill="#fbf8ed"] { fill: #192427; }
      .dark-chord-chart [stroke="#fbf8ed"] { stroke: #192427; }
      .dark-chord-chart [fill="#073840"] { fill: #e3f1ed; }
      .dark-chord-chart [stroke="#073840"] { stroke: #d6e8e3; }
      .dark-chord-chart [fill="#62736d"] { fill: #a5bbb4; }
      .dark-chord-chart [stroke="#45888a"] { stroke: #476e72; }
      .dark-chord-chart [stroke="#a6beb5"] { stroke: #3b5152; }
      ${Object.entries({ '#cc480e': '#ffa263', '#267b99': '#70d8ef', '#8b4695': '#d8a2ee', '#29805d': '#83d7ae', '#a06a16': '#e5bd70', '#be3d6a': '#f38eae', '#485aa3': '#a3b1ff', '#576b24': '#bbcf81' }).map(([from,to]) => `.dark-chord-chart [stroke="${from}"] { stroke: ${to}; } .dark-chord-chart [fill="${from}"] { fill: ${to}; }`).join('\n')}
      .dark-chord-chart [aria-label="Current chord"] > g > rect:first-child,
      .dark-chord-chart [aria-label="Starting chord"] > g > rect:first-child { stroke: #d6e8e3; }
    `}</style>}
    <title id={`${id}-title`}>{`${song.title} — chord path in ${song.key}`}</title>
    <desc id={`${id}-desc`}>{song.description}</desc>
    <rect x={viewX} y={viewY} width={viewWidth} height={viewHeight} fill={paper} />
    {!sectionId && <g fill={ink} fontFamily="Georgia, serif" textAnchor="middle">
      <text x={width / 2} y="110" fontSize={layout.titleSize || 94} fontWeight="700">{song.title}</text>
      <text x={width / 2} y="177" fontSize={layout.subtitleSize || 43}>{layout.subtitle}</text>
    </g>}
    {sections.map(section => <Grid key={section.id} section={section} />)}
    <CurrentChordIndicator svgRef={svgRef} target={current} initial={showStart ? layout.startOutline : null} />
    {sections.map(section => <RouteColors key={section.id} palette={section.palette} distinguishPasses preferredColor={section.color || orange} fill="none" strokeWidth="6" strokeLinejoin="round">
      {song.edges.filter(edge => edge.section === section.id).map(edge => {
        const path = reciprocal[edge.id]?.path || paths[edge.id];
        return path && <g key={edge.id} data-source={edge.source} data-target={edge.target}>
          <path d={path} stroke={paper} strokeWidth="15" />
          <path d={path} strokeWidth={edge.width || 6} data-fixed-color={reciprocal[edge.id]?.color || branchColorById[edge.id]} stroke={reciprocal[edge.id]?.color || branchColorById[edge.id] || edge.preferredColor} strokeDasharray={edge.passNumber === 2 ? '3 6' : undefined} />
        </g>;
      })}
    </RouteColors>)}
    {visibleNodes.map(node => <ChordNode key={node.id} node={node} visits={visits[node.id]} type={shapes[node.id]} />)}
    {song.durationLabels?.filter(label => visibleIds.has(label.nodeId)).map((label, i) => <DurationLabel key={i} x={byId[label.nodeId].x + (label.offsetX || 0)} y={byId[label.nodeId].y + label.offsetY}>{label.text}</DurationLabel>)}
    {showStart && layout.startLabel && <g data-chart-label="true" aria-label="Starting chord label">
      <rect x={layout.startLabel.x - 48} y={layout.startLabel.y - 23} width="96" height="32" rx="9" fill={orange} />
      <text x={layout.startLabel.x} y={layout.startLabel.y} textAnchor="middle" fill={paper} fontFamily="Georgia, serif" fontSize="23" fontWeight="700">START</text>
    </g>}
    {!sectionId && layout.annotations?.map((label, i) => <text key={i} x={label.x} y={label.y} textAnchor={label.anchor} fill={ink} fontFamily="Georgia, serif" fontSize="24">{label.text}</text>)}
    {!sectionId && layout.legend && <>
      <RouteColors distinguishPasses fill="none" strokeWidth="6">{layout.legend.map(label => <path key={label.label} d={`M${label.x} ${label.y} H${label.x + 105}`} strokeDasharray={label.passNumber === 2 ? '3 6' : undefined} />)}</RouteColors>
      {layout.legend.map(label => <text key={label.label} x={label.labelX} y={label.y + 10} fill={ink} fontFamily="Georgia, serif" fontSize="31">{label.label}</text>)}
    </>}
    {!sectionId && <text x={width / 2} y={layout.footerY} textAnchor="middle" fill={ink} fontFamily="Georgia, serif" fontSize={layout.footerSize || 25}>{layout.footer}</text>}
  </svg>;
});

export default SongChart;
