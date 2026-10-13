import { darkerTimelineColor } from './data/timelinePresentation.js';
import React, { useId } from 'react';
import { isBlackKey, pianoKeyX } from './data/pianoLayout.js';
import { blackKeyHeightRatio, pianoChordKeys, pianoRootPipe, neonPianoColor } from './data/pianoPresentation.js';

const names = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
export function PianoKeys({ first = 48, last = 59, x = 0, y = 0, width = 70, height = 200, notes = [], rootMidi, nextRootMidi, nextNotes = [], nextColor: nextNodeColor = '#267b99', color = '#c43b32', pipeVisitIndex, pipeSeekVersion, pipeFill = 0, showRootLabels = false, showNoteDots = true, emphasizeRoot = false }) {
  const nextColor = nextNodeColor === color ? darkerTimelineColor(nextNodeColor) : nextNodeColor;
  const neonColor = neonPianoColor(nextNodeColor);
  const shineId = `piano-root-${useId().replaceAll(':', '')}`;
  const rootFillId = `${shineId}-fill`;
  const rootBorderId = `${shineId}-border`;
  const rootShineColor = neonPianoColor(color);
  const glowId = `${shineId}-next-glow`;
  const origin = pianoKeyX(first, width) - width / 2;
  const keys = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const rootX = x + pianoKeyX(rootMidi ?? first, width) - origin;
  const nextX = x + pianoKeyX(nextRootMidi ?? first, width) - origin;
  const labelY = y + height + width * .36;
  const pipe = keys.includes(rootMidi) && keys.includes(nextRootMidi) ? pianoRootPipe(rootX, nextX, width, labelY) : null;
  const selected = midi => notes.includes(midi);
  return <g>
    <defs><linearGradient id={shineId} x1="0" y1="0" x2=".35" y2="1"><stop stopColor="white" stopOpacity=".12"/><stop offset=".1" stopColor="white" stopOpacity=".05"/><stop offset=".14" stopColor="white" stopOpacity={emphasizeRoot ? .85 : .5}/><stop offset=".19" stopColor="white" stopOpacity=".05"/><stop offset=".7" stopColor="white" stopOpacity="0"/><stop offset="1" stopColor="white" stopOpacity="0"/></linearGradient><linearGradient id={rootFillId} x1="0" y1="0" x2="0" y2="1"><stop stopColor={rootShineColor}/><stop offset=".65" stopColor={rootShineColor}/><stop offset="1" stopColor={color}/></linearGradient><linearGradient id={rootBorderId} x1="0" y1="0" x2=".35" y2="1"><stop stopColor={rootShineColor}/><stop offset=".3" stopColor={color}/><stop offset=".6" stopColor={rootShineColor}/><stop offset="1" stopColor={color}/></linearGradient><filter id={glowId} x="-40%" y="-150%" width="180%" height="400%"><feGaussianBlur stdDeviation="5"/></filter></defs>
    <style>{`@keyframes piano-next-wobble { 0%, 100% { transform: translateX(-3px) rotate(-2deg); } 50% { transform: translateX(3px) rotate(2deg); } } .piano-next-tip { pointer-events: none; } .piano-next-root-tip { animation: piano-next-wobble .65s ease-in-out infinite; transform-box: fill-box; transform-origin: center; } @media (prefers-reduced-motion: reduce) { .piano-next-root-tip { animation: none; } }`}</style>
    {[false, true].map(black => keys.filter(midi => isBlackKey(midi) === black).map(midi => {
      const center = x + pianoKeyX(midi, width) - origin;
      const keyWidth = black ? width * .58 : width;
      const keyHeight = black ? height * blackKeyHeightRatio : height;
      const active = selected(midi);
      const tipHeight = (nextRootMidi === midi ? 46 : 32) * 2.5;
      const root = active && rootMidi === midi;
      return <g key={midi} data-piano-key={midi} data-piano-root={root || undefined} data-piano-next={nextNotes.includes(midi) || undefined} data-piano-next-root={nextRootMidi === midi || undefined}>
        <rect x={center - keyWidth / 2} y={y} width={keyWidth - 2} height={keyHeight} rx={black ? 4 : 6} fill={root && emphasizeRoot ? `url(#${rootFillId})` : active ? color : black ? '#24272b' : '#faf7ed'} stroke={black ? '#101419' : '#9ba3a5'} strokeWidth="2"/>
        {root && <>
          <defs><clipPath id={`${shineId}-clip-${midi}`}><rect x={center - keyWidth / 2} y={y} width={keyWidth - 2} height={keyHeight} rx={black ? 4 : 6}/></clipPath></defs>
          <g clipPath={`url(#${shineId}-clip-${midi})`}>
            <rect x={center - keyWidth / 2} y={y} width={keyWidth - 2} height={keyHeight} rx={black ? 4 : 6} fill={`url(#${shineId})`} stroke="#14242b" strokeWidth={emphasizeRoot ? 8 : 6}/>
            <rect x={center - keyWidth / 2 + 4} y={y + 4} width={keyWidth - 10} height={keyHeight - 8} rx="3" fill="none" stroke={`url(#${rootBorderId})`} strokeWidth="2"/>
          </g>
        </>}
        {nextNotes.includes(midi) && <g data-next-tip={midi} className={nextRootMidi === midi ? 'piano-next-tip piano-next-root-tip' : 'piano-next-tip'}>
          <rect x={center - keyWidth / 2 + 5} y={y + keyHeight - (tipHeight + 8)} width={keyWidth - 12} height={tipHeight + 6} rx="8" fill={neonColor} opacity=".95" filter={`url(#${glowId})`}/>
          <rect x={center - keyWidth / 2 + 6} y={y + keyHeight - (tipHeight + 2)} width={keyWidth - 14} height={tipHeight} rx="6" fill="none" stroke="#14242b" strokeWidth={nextRootMidi === midi ? 10 : 8}/>
          <rect x={center - keyWidth / 2 + 6} y={y + keyHeight - (tipHeight + 2)} width={keyWidth - 14} height={tipHeight} rx="6" fill={nextColor} stroke={neonColor} strokeOpacity="1" strokeWidth={nextRootMidi === midi ? 5 : 3}/>
          <rect x={center - keyWidth / 2 + 15} y={y + keyHeight - (tipHeight - 12)} width={keyWidth - 32} height={nextRootMidi === midi ? 15 : 8} rx="2" fill="white" opacity={nextRootMidi === midi ? .95 : .6}/>
          <text x={center} y={y + keyHeight - (tipHeight * .32)} textAnchor="middle" fontSize={width * .16} fontWeight="900" fill="white" stroke="#14242b" strokeWidth="3" paintOrder="stroke">{nextRootMidi === midi ? 'R' : [3,4].includes((midi - nextRootMidi + 120) % 12) ? '3' : '7'}</text>
        </g>}
        {active && showNoteDots && <circle cx={center} cy={y + keyHeight - (nextNotes.includes(midi) ? tipHeight + 92 : 42)} r={width * (root && emphasizeRoot ? .21 : .13)} fill="white" opacity=".9"/>}
        {root && emphasizeRoot && <text x={center} y={y + keyHeight - 42 + width * .07} textAnchor="middle" fontSize={width * .21} fontWeight="900" fill="#14242b">R</text>}
      </g>;
    }))}
    {nextNotes.filter(midi => keys.includes(midi) && isBlackKey(midi)).map(midi => {
      const center = x + pianoKeyX(midi, width) - origin;
      const role = midi === nextRootMidi ? 'R' : [3,4].includes((midi - nextRootMidi + 120) % 12) ? '3' : '7';
      return <g key={`below-${midi}`} data-next-below-key={midi} pointerEvents="none">
        <path d={`M${center} ${y + height + 2} v14`} stroke={neonColor} strokeWidth="5"/>
        <rect x={center - width * .22} y={y + height + 18} width={width * .44} height={width * .22} rx="10" fill="#14242b" stroke={neonColor} strokeWidth="4"/>
        <text x={center} y={y + height + 18 + width * .15} textAnchor="middle" fontSize={width * .13} fontWeight="900" fill={neonColor} stroke="#14242b" strokeWidth="1.5" paintOrder="stroke">{role}</text>
      </g>;
    })}
    {pipe && <g fill="none" pointerEvents="none">
      <path d={pipe.path} stroke="#14242b" strokeWidth="22" strokeLinecap="round"/>
      <path d={pipe.path} stroke={neonColor} strokeOpacity=".35" strokeWidth="16" strokeLinecap="round"/>
      <path d={pipe.path} stroke={neonColor} strokeWidth="10" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-pipeFill} data-playback-pipe={pipeVisitIndex} data-pipe-seek-version={pipeSeekVersion}/>
      <path d={pipe.path} stroke="white" strokeOpacity=".85" strokeWidth="3" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-pipeFill} data-playback-pipe={pipeVisitIndex} data-pipe-seek-version={pipeSeekVersion}/>
    </g>}
    {[...(showRootLabels && keys.includes(rootMidi) ? [{ text: 'CURR', x: rootX, y: pipe?.currentY ?? labelY, color }] : []), ...(keys.includes(nextRootMidi) ? [{ text: 'NEXT', x: nextX, y: pipe?.nextY ?? labelY, color: neonColor }] : [])].map(badge => <g key={badge.text} pointerEvents="none" transform={`translate(${badge.x} ${badge.y})`}>
      <rect x={-width * .33} y="0" width={width * .66} height={width * .25} rx="12" fill={badge.text === 'NEXT' ? '#14242b' : '#f8faf7'} stroke={badge.color} strokeWidth="4"/>
      <text x="0" y={width * .18} textAnchor="middle" fontSize={width * .17} fontWeight="900" letterSpacing="2" fill={badge.color}>{badge.text}</text>
    </g>)}
  </g>;
}
export default function PianoKeyboard({ chord, color, showChordName = true, showDetails = true }) {
  if (!chord || chord === 'NC') return <div className="shell-chord-empty">{chord === 'NC' ? 'No chord' : 'Choose a chord to see its piano voicing.'}</div>;
  const { notes, rootMidi, substitution } = pianoChordKeys(chord);
  const first = 43, last = 64;
  const width = 48, extent = pianoKeyX(last, width) - pianoKeyX(first, width) + width;
  return <div className="shell-chord shell-chord-full piano-chord">
    <svg className="fretboard-overview" viewBox={`-5 -5 ${extent + 10} 230`} role="img" aria-label={`${chord} piano voicing: ${notes.map(midi => `${names[midi % 12]}${Math.floor(midi / 12) - 1}`).join(', ')}`}>
      <PianoKeys first={first} last={last} width={width} height={220} notes={notes} rootMidi={rootMidi} color={color} emphasizeRoot/>
    </svg>
    {showDetails && <div>{showChordName && <strong>{chord.replaceAll('b','♭').replaceAll('#','♯')}</strong>}<span>Root · 3rd · 7th shell</span>{substitution && <span>Shell substitution</span>}</div>}
  </div>;
}
