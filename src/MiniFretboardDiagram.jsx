import React from 'react';
import { guitarStrings } from './shellVoicing.js';

export default function MiniFretboardDiagram({ notes, darkMode, label, color = 'var(--accent)' }) {
  const fretted = notes.filter(note => note.fret > 0).map(note => note.fret);
  const firstFret = fretted.length ? Math.min(...fretted) : 1;
  const count = Math.max(4, (fretted.length ? Math.max(...fretted) : firstFret) - firstFret + 1);
  const end = 49 + count * 27;
  const x = fret => fret === 0 ? 31 : 49 + (fret - firstFret + .5) * 27;
  const y = string => 145 - string * 23;
  return <svg className="mini-fretboard-diagram" viewBox={`0 0 ${end + 14} 166`} role="img" aria-label={label}>
    {Array.from({ length: count + 1 }, (_, i) => <line key={i} x1={49 + i * 27} x2={49 + i * 27} y1="30" y2="145" stroke="currentColor" opacity=".35" strokeWidth={firstFret === 1 && i === 0 ? 3 : 1} />)}
    {guitarStrings.map((string, index) => {
      const note = notes.find(note => note.string === index);
      return <g key={string}>
        <line x1="49" x2={end} y1={y(index)} y2={y(index)} stroke="currentColor" opacity=".5" />
        <text x="13" y={y(index) + 4} textAnchor="middle" fontSize="11" fill="currentColor">{string}</text>
        {!note && <text x="31" y={y(index) + 4} textAnchor="middle" fontSize="15" fill="currentColor">×</text>}
        {note && <><circle cx={x(note.fret)} cy={y(index)} r="10" fill={note.fret === 0 ? 'var(--surface)' : color} stroke={note.role === 'R' ? '#050505' : color} strokeWidth={note.role === 'R' ? 2.5 : 1} /><text x={x(note.fret)} y={y(index) + 3.5} textAnchor="middle" fontSize="10" fontWeight="800" fill={note.fret === 0 ? color : darkMode ? 'var(--ink)' : 'white'}>{note.role}</text></>}
      </g>;
    })}
    {Array.from({ length: count }, (_, i) => <text key={i} x={x(firstFret + i)} y="14" textAnchor="middle" fontSize="11" fill="currentColor">{firstFret + i}</text>)}
  </svg>;
}
