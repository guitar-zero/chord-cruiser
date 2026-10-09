import CurrentChordIndicator from './CurrentChordIndicator.jsx';
import useArrowSafeLabels from './useArrowSafeLabels.js';
import React, { useId } from 'react';
import RouteColors from './RouteColors.jsx';
import StepBadge from './StepBadge.jsx';
import DurationLabel from './DurationLabel.jsx';

export default function AutumnLeaves({ currentChord, ...props }) {
  const id = useId();
  const svgRef = useArrowSafeLabels();
  const nodes = [
    { chord: 'Dm', x: 1338, y: 788, step: 1 },
    { chord: 'G7', x: 1338, y: 550, step: 2 },
    { chord: 'C', x: 663, y: 788, step: 3 },
    { chord: 'F', x: 663, y: 550, step: 4 },
    { chord: 'B°', x: 328, y: 788, step: 5 },
    { chord: 'E7', x: 328, y: 550, step: 6 },
    { chord: 'Am', x: 328, y: 346, step: 7 },
  ];
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" role="img" aria-labelledby={`${id}-title ${id}-desc`} {...props}>
      <title id={`${id}-title`}>Autumn Leaves — chord path in C</title>
      <desc id={`${id}-desc`}>Frets seven through ten on the low E, A, and D strings. Start on Dm at low E fret ten, then follow G7, C, F, B diminished, E7, and A minor. Arrows show movement between root positions.</desc>
      <defs><marker id={`${id}-arrow`} viewBox="0 0 12 12" refX="1" refY="6" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" orient="auto" overflow="visible"><path d="M1 1 L11 6 L1 11 Z" fill="#cc480e" stroke="none" strokeWidth="0" markerStart="none" markerMid="none" markerEnd="none" /></marker></defs>
      <rect width="1536" height="1024" fill="#fbf8ed" />
      <g fill="#073840" fontFamily="Georgia, 'Times New Roman', serif" textAnchor="middle">
        <text x="768" y="105" fontSize="96" fontWeight="700">Autumn Leaves</text>
        <text x="768" y="177" fontSize="49">Chord path in C · Frets 7–10</text>
        {[328, 663, 998, 1338].map((x, i) => <text key={x} x={x} y="244" fontSize="49">{7 + i}</text>)}
      </g>
      <g stroke="#45888a" strokeWidth="4" fill="none">
        {[183, 500, 835, 1168, 1494].map(x => <path key={x} d={`M${x} 262 V904`} />)}
        {[346, 550, 788].map(y => <path key={y} d={`M183 ${y} H1494`} />)}
      </g>
      <g fill="#073840" fontFamily="Georgia, serif" fontSize="58" fontWeight="700" textAnchor="end">
        <text x="157" y="365">D</text><text x="157" y="569">A</text><text x="157" y="807">Low E</text>
      </g>
      <RouteColors stroke="#cc480e" strokeWidth="13" fill="none" strokeLinecap="round" markerEnd={`url(#${id}-arrow)`}>
        <path d="M1338 715 V622" />
        <path d="M1275 578 L740 758" />
        <path d="M663 715 V622" />
        <path d="M609 592 L389 742" />
        <path d="M328 715 V622" />
        <path d="M328 477 V418" />
      </RouteColors>
      <rect x="1268" y="856" width="140" height="43" rx="13" fill="#cc480e" />
      <text x="1338" y="886" textAnchor="middle" fill="#fbf8ed" fontFamily="Georgia, serif" fontSize="30" fontWeight="700">START</text>
      {nodes.map(node => (
        <g key={node.chord} data-node-id={node.chord}>
          <circle cx={node.x} cy={node.y} r="68" fill="#fbf8ed" stroke="#073840" strokeWidth="5" />
          <StepBadge x={node.x} y={node.y - 88} step={node.step} />
          {node.chord === 'Am' && <DurationLabel x={node.x} y={node.y + 93}>×2</DurationLabel>}
          <text x={node.x} y={node.y + 4} textAnchor="middle" dominantBaseline="middle" fill="#073840" fontFamily="Georgia, serif" fontSize="58" fontWeight="700">{node.chord}</text>
        </g>
      ))}
      <CurrentChordIndicator svgRef={svgRef} target={currentChord} initial={{ x: 1261, y: 711, width: 154, height: 154 }} />
      <text x="768" y="985" textAnchor="middle" fill="#073840" fontFamily="Georgia, serif" fontSize="49" fontWeight="700">Dm → G7 → C → F → B° → E7 → Am</text>
    </svg>
  );
}
