import CurrentChordIndicator from './CurrentChordIndicator.jsx';
import useArrowSafeLabels from './useArrowSafeLabels.js';
import React, { useId } from 'react';
import RouteColors from './RouteColors.jsx';
import StepBadge from './StepBadge.jsx';
import DurationLabel from './DurationLabel.jsx';

const fretWidth = 260;
const stringHeight = 270;
const gridLeft = 190;
const stringY = { D: 350, A: 350 + stringHeight, E: 350 + 2 * stringHeight };
const rootX = fret => gridLeft + (fret - 8 + 0.5) * fretWidth;
const radius = 46;

export const solarNodes = [
  { id: 'cm', chord: 'Cm', root: 'C', fret: 8, string: 'E', offset: -60 },
  { id: 'gm', chord: 'Gm', root: 'G', fret: 10, string: 'A', offset: -60 },
  { id: 'c7', chord: 'C7', root: 'C', fret: 8, string: 'E', offset: 60 },
  { id: 'f', chord: 'F', root: 'F', fret: 8, string: 'A', offset: -60 },
  { id: 'fm', chord: 'Fm', root: 'F', fret: 8, string: 'A', offset: 60 },
  { id: 'bb7', chord: 'B♭7', root: 'B♭', fret: 8, string: 'D' },
  { id: 'eb', chord: 'E♭', root: 'E♭', fret: 11, string: 'E', offset: -60 },
  { id: 'ebm', chord: 'E♭m', root: 'E♭', fret: 11, string: 'E', offset: 60 },
  { id: 'ab7', chord: 'A♭7', root: 'A♭', fret: 11, string: 'A' },
  { id: 'db', chord: 'D♭', root: 'D♭', fret: 11, string: 'D' },
  { id: 'ddim', chord: 'D°', root: 'D', fret: 10, string: 'E' },
  { id: 'g7', chord: 'G7', root: 'G', fret: 10, string: 'A', offset: 60 },
].map((node, index) => ({ ...node, step: index + 1, x: rootX(node.fret) + (node.offset || 0), y: stringY[node.string] }));

export const solarEdges = solarNodes.slice(0, -1).map((node, i) => ({ source: node.id, target: solarNodes[i + 1].id }));

function edgePath(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy);
  const gap = radius + 9;
  return `M${source.x + dx / length * gap} ${source.y + dy / length * gap} L${target.x - dx / length * gap} ${target.y - dy / length * gap}`;
}

export default function Solar({ currentChord, ...props }) {
  const id = useId();
  const svgRef = useArrowSafeLabels();
  const byId = Object.fromEntries(solarNodes.map(node => [node.id, node]));
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1220" role="img" aria-labelledby={`${id}-title ${id}-desc`} {...props}>
      <title id={`${id}-title`}>Solar — chord graph in C minor</title>
      <desc id={`${id}-desc`}>Simplified twelve-bar Solar progression. Cm, Gm, C7, F, Fm, B flat seven, E flat, E flat minor, A flat seven, D flat, D diminished, G7. Each chord has a separate node. Root positions follow frets eight through eleven on the low E, A, and D strings.</desc>
      <defs>{[['arrow', '#cc480e'], ['six-seven', '#267b99'], ['ten-eleven', '#8b4695']].map(([name, color]) => <marker key={name} id={`${id}-${name}`} viewBox="0 0 12 12" refX="1" refY="6" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" orient="auto" overflow="visible"><path d="M1 1 L11 6 L1 11 Z" fill={color} stroke="none" strokeWidth="0" markerStart="none" markerMid="none" markerEnd="none" /></marker>)}</defs>
      <rect width="1500" height="1220" fill="#fbf8ed" />
      <g fill="#073840" fontFamily="Georgia, serif" textAnchor="middle">
        <text x="750" y="110" fontSize="94" fontWeight="700">Solar</text>
        <text x="750" y="177" fontSize="43">C minor · Frets 8–11</text>
      </g>
      <g stroke="#45888a" strokeWidth="3" fill="none">
        {[0, 1, 2, 3, 4].map(i => <path key={i} d={`M${gridLeft + i * fretWidth} 285 V960`} />)}
        {Object.values(stringY).map(y => <path key={y} d={`M${gridLeft} ${y} H${gridLeft + 4 * fretWidth}`} />)}
      </g>
      <g fill="#073840" fontFamily="Georgia, serif" fontSize="35" textAnchor="middle">
        {[8, 9, 10, 11].map(fret => <text key={fret} x={rootX(fret)} y="266">{fret}</text>)}
      </g>
      <g fill="#073840" fontFamily="Georgia, serif" fontSize="34" textAnchor="end" dominantBaseline="middle">
        <text x="170" y={stringY.D}>D</text><text x="170" y={stringY.A}>A</text><text x="170" y={stringY.E}>Low E</text>
      </g>
      <RouteColors>{solarEdges.map(edge => {
        const source = byId[edge.source], target = byId[edge.target];
        const color = edge.source === 'bb7' ? '#267b99' : edge.source === 'db' ? '#8b4695' : '#cc480e';
        const marker = edge.source === 'bb7' ? 'six-seven' : edge.source === 'db' ? 'ten-eleven' : 'arrow';
        const path = edgePath(source, target);
        return <g key={edge.source} data-source={edge.source} data-target={edge.target} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={path} stroke="#fbf8ed" strokeWidth="15" />
          <path d={path} stroke={color} strokeWidth="6" markerEnd={`url(#${id}-${marker})`} />
        </g>;
      })}</RouteColors>
      {solarNodes.map(node => <g key={node.id} id={`${id}-${node.id}`} data-node-id={node.id} data-root={node.root} data-fret={node.fret} data-string={node.string}>
        <circle cx={node.x} cy={node.y} r={radius} fill="#fbf8ed" stroke="#073840" strokeWidth="4" />
        <text x={node.x} y={node.y + 5} textAnchor="middle" dominantBaseline="middle" fill="#073840" fontFamily="Georgia, serif" fontSize="35" fontWeight="700">{node.chord}</text>
        <StepBadge x={node.x} y={node.y - radius - 18} step={node.step} />
      </g>)}
      {solarNodes.filter(node => ['cm', 'f', 'ebm', 'ab7', 'ddim', 'g7'].includes(node.id)).map(node => <DurationLabel key={node.id} x={node.x} y={node.y + (node.id === 'cm' ? 112 : 72)}>{['cm', 'f'].includes(node.id) ? '×2' : 'half-bar'}</DurationLabel>)}
      <text x={byId.cm.x} y={byId.cm.y + 85} textAnchor="middle" fill="#cc480e" fontFamily="Georgia, serif" fontSize="23" fontWeight="700">START</text>
      <CurrentChordIndicator svgRef={svgRef} target={currentChord} initial={{ x: byId.cm.x - 55, y: byId.cm.y - 55, width: 110, height: 110 }} />
      <text x="750" y="1187" textAnchor="middle" fill="#62736d" fontFamily="Georgia, serif" fontSize="25">Follow steps 1–12. Separate nodes share the same root position.</text>
    </svg>
  );
}
