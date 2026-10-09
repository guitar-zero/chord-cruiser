import CurrentChordIndicator from './CurrentChordIndicator.jsx';
import useArrowSafeLabels from './useArrowSafeLabels.js';
import React, { useId } from 'react';
import RouteColors from './RouteColors.jsx';
import StepBadge from './StepBadge.jsx';
import DurationLabel from './DurationLabel.jsx';

const fretWidth = 165;
const stringHeight = 185;
const rowY = [405, 405 + stringHeight, 405 + 2 * stringHeight];
const chorusPalette = ['#cc480e', '#8b4695', '#be3d6a', '#a06a16'];
const versePalette = ['#267b99', '#29805d', '#485aa3', '#576b24'];

function Section({ id, left, verse }) {
  const x8 = left + fretWidth / 2;
  const x10 = x8 + 2 * fretWidth;
  const yStart = verse ? rowY[1] : rowY[2];
  const yD = rowY[2];
  const yG = rowY[1];
  const boundary = left + 3 * fretWidth;
  const nodes = [
    { id: 'start', x: x8, y: yStart, chord: verse ? 'F6' : 'C6', root: verse ? 'F' : 'C', string: verse ? 'A' : 'low-E', fret: 8, start: true },
    { id: 'g7', x: x10, y: yG, chord: 'G7', root: 'G', string: 'A', fret: 10 },
    // Separate graph nodes share a fretboard anchor; offsets stay inside fret 10.
    { id: 'd7', x: x10 - 50, y: yD, chord: 'D7', root: 'D', string: 'low-E', fret: 10, compact: true },
    { id: 'dm', x: x10 + 50, y: yD, chord: 'Dm', root: 'D', string: 'low-E', fret: 10, compact: true },
  ].map(node => ({ ...node, step: ({ start: 1, d7: 2, dm: 3, g7: 4 })[node.id] + (verse ? 4 : 0) }));
  const duration = verse
    ? { start: '×4', d7: '×2' }
    : { start: '×2; later ×1', d7: '×2', dm: '×1; turn half-bar', g7: '×1; turn half-bar' };
  return (
    <g data-section={verse ? 'verse' : 'chorus'}>
      <rect x={left - 50} y="215" width="650" height="700" rx="20" fill="none" stroke="#a6beb5" strokeWidth="3" />
      <text x={left + 247.5} y="286" textAnchor="middle" fill={verse ? versePalette[0] : chorusPalette[0]} fontFamily="Georgia, serif" fontSize="43" fontWeight="700">{verse ? 'VERSE' : 'CHORUS'}</text>
      <g stroke="#45888a" strokeWidth="3" fill="none">
        {[0, 1, 2, 3].map(i => <path key={i} d={`M${left + i * fretWidth} 365 V${yD + 48}`} />)}
        {rowY.map(y => <path key={y} d={`M${left} ${y} H${boundary}`} />)}
      </g>
      <g fill="#62736d" fontFamily="Georgia, serif" fontSize="25" textAnchor="middle">
        {[8, 9, 10].map((fret, i) => <text key={fret} x={x8 + i * fretWidth} y="347">{fret}</text>)}
      </g>
      <g fill="#073840" fontFamily="Georgia, serif" fontSize="22" textAnchor="end" dominantBaseline="middle">
        <text x={left - 12} y={rowY[0]}>D</text><text x={left - 12} y={rowY[1]}>A</text><text x={left - 12} y={rowY[2]}>E</text>
      </g>
      <RouteColors distinguishPasses palette={verse ? versePalette : chorusPalette} preferredColor={verse ? versePalette[0] : chorusPalette[0]} fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
        {verse ? <path d={`M${x8 + 53} ${yStart + 31} L${x10 - 76} ${yD - 19}`} /> : <path d={`M${x8 + 58} ${yD} H${x10 - 80}`} />}
        <path data-source="dm" data-target="g7" data-pass="first" d={`M${x10 + 36} ${yD - 37} L${x10 + 14} ${yG + 61}`} />
        {!verse && <>
          <path d={`M${x10 - 53} ${yG + 30} L${x8 + 53} ${yD - 31}`} />
          <path d={`M${x8} ${yD + 59} V${yD + 99} H${x10 + 44} V${yD + 38}`} strokeDasharray="3 6" />
          <path data-source="dm" data-target="g7" data-pass="second" d={`M${x10 + 81} ${yD} H${boundary + 77} V${yG} H${x10 + 61}`} strokeDasharray="3 6" />
          <path d={`M${x10 - 27} ${yG - 55} L${x10 - 105} 461`} strokeDasharray="3 6" />
        </>}
        <path data-source="d7" data-target="dm" d={`M${x10 - 17} ${yD} H${x10 + 15}`} strokeWidth="3" />
      </RouteColors>
      {nodes.map(node => <g key={node.id} id={`${id}-${verse ? 'verse' : 'chorus'}-${node.id}`} data-node-id={node.id} data-chord={node.chord} data-root={node.root} data-string={node.string} data-fret={node.fret}>
        {node.start ? <rect x={node.x - 58} y={node.y - 53} width="116" height="106" rx="16" fill="#fbf8ed" stroke="#073840" strokeWidth="4" /> : <circle cx={node.x} cy={node.y} r={node.compact ? 32 : 54} fill="#fbf8ed" stroke="#073840" strokeWidth="4" />}
        <text x={node.x} y={node.y + 4} textAnchor="middle" dominantBaseline="middle" fill="#073840" fontFamily="Georgia, serif" fontSize={node.compact ? 28 : 49} fontWeight="700">{node.chord}</text>
        <StepBadge x={node.x} y={node.y - (node.compact ? 32 : 54) - 20} step={node.step} color={verse ? versePalette[0] : chorusPalette[0]} />
      </g>)}
      {nodes.filter(node => duration[node.id]).map(node => <DurationLabel key={node.id} x={node.x} y={node.y + (node.start && !verse ? 110 : node.compact ? (node.id === 'dm' ? 100 : 65) : 83)}>{duration[node.id]}</DurationLabel>)}
      {!verse && <g aria-label="Start at C6">
        <g data-chart-label="true"><rect x={x8 - 48} y={yStart + 54} width="96" height="32" rx="9" fill={chorusPalette[0]} />
        <text x={x8} y={yStart + 77} textAnchor="middle" fill="#fbf8ed" fontFamily="Georgia, serif" fontSize="23" fontWeight="700">START</text></g>
      </g>}
      <text x={verse ? x10 : x10 - 115} y={verse ? 473 : 455} textAnchor="end" fill="#073840" fontFamily="Georgia, serif" fontSize="24">{verse ? 'Return to chorus' : 'To verse'}</text>
    </g>
  );
}

export default function TakeTheATrain({ currentChord, ...props }) {
  const id = useId();
  const svgRef = useArrowSafeLabels();
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1700 1120" role="img" aria-labelledby={`${id}-title ${id}-description`} {...props}>
      <title id={`${id}-title`}>Take the A Train — chord path in C</title>
      <desc id={`${id}-description`}>Equally measured fretboard grids for chorus and verse, frets eight through ten on D, A, and low E strings. Chorus C6 to D7 to Dm to G7 to C6, second pass C6 to Dm to G7 then verse. Verse F6 to D7 to Dm to G7. D7 and Dm are separate graph nodes within low E fret ten. Solid arrows mark first pass, dotted arrows second pass.</desc>
      <defs><marker id={`${id}-arrow`} viewBox="0 0 12 12" refX="1" refY="6" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" orient="auto" overflow="visible"><path d="M1 1 L11 6 L1 11 Z" fill="#cc480e" stroke="none" strokeWidth="0" markerStart="none" markerMid="none" markerEnd="none" /></marker></defs>
      <rect width="1700" height="1120" fill="#fbf8ed" />
      <g fill="#073840" fontFamily="Georgia, serif" textAnchor="middle">
        <text x="850" y="112" fontSize="88" fontWeight="700">Take the A Train</text>
        <text x="850" y="176" fontSize="43">Chord path in C · Frets 8–10</text>
      </g>
      <Section id={id} left={145} verse={false} />
      <Section id={id} left={955} verse />
      <RouteColors distinguishPasses palette={chorusPalette} fill="none" strokeWidth="7">
        <path d="M245 985 H350" /><path d="M885 985 H990" strokeDasharray="3 6" />
      </RouteColors>
      <g fill="#073840" fontFamily="Georgia, serif" fontSize="31">
        <text x="380" y="995">First pass</text><text x="1020" y="995">Second pass</text>
      </g>
      <CurrentChordIndicator svgRef={svgRef} target={currentChord} initial={{ x: 160.5, y: 713, width: 134, height: 124 }} />
      <text x="850" y="1070" textAnchor="middle" fill="#62736d" fontFamily="Georgia, serif" fontSize="24">First pass: 1 → 2 → 3 → 4 · Second pass: 1 → 3 → 4 · Verse: 5 → 6 → 7 → 8</text>
    </svg>
  );
}
