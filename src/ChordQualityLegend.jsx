import React from 'react';
import { chordQualityPalette } from './data/chordQualityColors.js';
import { timelineColor } from './data/timelinePresentation.js';

export default function ChordQualityLegend({ darkMode }) {
  return <div className="chord-quality-legend" role="list" aria-label="Chord quality color legend">
    {chordQualityPalette.map(entry => <span key={entry.id} role="listitem" className={['major', 'minor', 'dominant'].includes(entry.id) ? 'chord-quality-primary' : undefined}>
      <i aria-hidden="true" style={{ background: timelineColor(entry.color, darkMode) }} />{entry.label}
    </span>)}
  </div>;
}
