import PianoKeyboard from './PianoKeyboard.jsx';
import React, { memo, useState } from 'react';
import { guitarStrings, shellVoicing } from './shellVoicing.js';
import FretboardDiagram from './FretboardDiagram.jsx';

function ShellChordDiagram({ chord, node, color = 'var(--accent)', darkMode, fullFretboard = false, showOrientationToggle = true, showChordName = true, showDetails = true, instrument = node?.instrument }) {
  const [vertical, setVertical] = useState(false);
  if (instrument === 'piano') return <PianoKeyboard chord={chord} color={color} showChordName={showChordName} showDetails={showDetails}/>;
  const voicing = shellVoicing(chord, node);
  if (!voicing) return <div className="shell-chord-empty">{chord === 'NC' ? 'No chord' : /sus/.test(chord || '') ? 'Suspended chord: no third for a shell voicing.' : 'No chart root position for this chord.'}</div>;
  const firstFret = Math.max(1, Math.min(...voicing.notes.filter(note => note.fret > 0).map(note => note.fret)));
  const fretCount = Math.max(4, Math.max(...voicing.notes.map(note => note.fret)) - firstFret + 1);
  const fretPosition = fret => fret === 0 ? 31 : 49 + (fret - firstFret + .5) * 27;
  const end = 49 + fretCount * 27;
  // Vertical: low E on the left. Horizontal: low E at the bottom.
  const point = (fret, string) => vertical
    ? { x: 30 + string * 23, y: fret }
    : { x: fret, y: 145 - string * 23 };
  const line = (start, finish) => ({ x1: start.x, y1: start.y, x2: finish.x, y2: finish.y });
  const rootPosition = fretPosition(node.fret);
  const highlight = vertical
    ? { x: 20, y: rootPosition - 13.5, width: 135, height: 27 }
    : { x: rootPosition - 13.5, y: 20, width: 27, height: 135 };
  const description = `${chord} shell, ${vertical ? 'vertical' : 'horizontal'} fretboard. Current root fret ${node.fret}: ${voicing.notes.map(note => `${note.role} on ${guitarStrings[note.string]} string, fret ${note.fret}`).join('; ')}. Other strings muted.`;
  const noteText = darkMode ? 'var(--ink)' : 'white';
  return <div className={`shell-chord${fullFretboard ? ' shell-chord-full' : ''}`}>
    {fullFretboard ? <FretboardDiagram notes={voicing.notes} activeFret={node.fret} color={color} darkMode={darkMode} vertical={vertical} label={description} /> : <svg viewBox={vertical ? `0 0 166 ${end + 14}` : `0 0 ${end + 14} 166`} role="img" aria-label={description}>
      <rect {...highlight} rx="5" fill={color} opacity=".16" />
      <rect {...highlight} rx="5" fill="none" stroke={color} strokeWidth="1.5" />
      {Array.from({ length: fretCount + 1 }, (_, i) => <line key={`f${i}`} {...line(point(49 + i * 27, 0), point(49 + i * 27, 5))} stroke="currentColor" opacity=".35" strokeWidth={firstFret === 1 && i === 0 ? 3 : 1} />)}
      {guitarStrings.map((string, i) => {
        const note = voicing.notes.find(note => note.string === i);
        const label = point(13, i);
        const mute = point(31, i);
        const dot = note && point(fretPosition(note.fret), i);
        const isRoot = note?.role === 'R';
        return <g key={string}>
          {isRoot && <line {...line(point(31, i), point(end, i))} stroke={color} strokeWidth="8" opacity=".18" strokeLinecap="round" />}
          <line {...line(point(49, i), point(end, i))} stroke={isRoot ? color : 'currentColor'} strokeWidth={isRoot ? 2.5 : 1} opacity={isRoot ? 1 : .5} />
          <text x={label.x} y={label.y + 3.5} textAnchor="middle" fontSize="11" fontWeight={isRoot ? 800 : 400} fill="currentColor">{string}</text>
          {!note && <text x={mute.x} y={mute.y + 4} textAnchor="middle" fill="currentColor" fontSize="15">×</text>}
          {note && <><circle cx={dot.x} cy={dot.y} r="10" fill={note.fret === 0 ? 'var(--surface)' : color} stroke={isRoot ? "#050505" : color} strokeWidth={isRoot ? 2.5 : 1} /><text x={dot.x} y={dot.y + 3.5} textAnchor="middle" fontSize="10" fontWeight={isRoot ? 900 : 700} fill={note.fret === 0 ? color : noteText}>{note.role}</text></>}
        </g>;
      })}
      {[...(node.fret === 0 ? [0] : []), ...Array.from({ length: fretCount }, (_, i) => firstFret + i)].map(fret => {
        const active = fret === node.fret;
        const center = vertical ? { x: 13, y: fretPosition(fret) } : { x: fretPosition(fret), y: 13 };
        return <g key={fret}>
          {active && <rect x={center.x - 12} y={center.y - 10} width="24" height="20" rx="5" fill={color} />}
          <text x={center.x} y={center.y + 4} textAnchor="middle" fontSize={active ? 13 : 11} fontWeight={active ? 800 : 400} fill={active ? noteText : 'currentColor'}>{fret}</text>
        </g>;
      })}
    </svg>}
    {showDetails && <div>{showChordName && <strong>{chord?.replaceAll('b', '♭').replaceAll('#', '♯')}</strong>}<span>Root · 3rd · 7th</span><span>{node.string === 'E' ? 'Low E' : node.string} string · <b>fret {node.fret}</b></span>{voicing.substitution && <span>{voicing.label.replaceAll('b', '♭')} shell substitution</span>}
      {showOrientationToggle && <button className="shell-orientation-toggle" type="button" aria-pressed={vertical} title={vertical ? 'Switch to horizontal fretboard' : 'Switch to standard vertical chord diagram'} onClick={() => setVertical(value => !value)}>Change diagram orientation</button>}
    </div>}
  </div>;
}
export default memo(ShellChordDiagram);
