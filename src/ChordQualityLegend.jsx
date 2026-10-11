import React from 'react';
import { chordQualityPalette } from './data/chordQualityColors.js';
import { timelineColor } from './data/timelinePresentation.js';

export default function ChordQualityLegend({ darkMode, compact = false }) {
  const shortLabels = { major7: 'Maj', minor7: 'Min', dominant: 'Dom7', other: 'Dim' };
  return <div className="chord-quality-legend" role="list" aria-label="Chord quality color legend">
    {chordQualityPalette.map(entry => <span key={entry.id} role="listitem" className="chord-quality-primary" title={compact ? entry.label : undefined} aria-label={compact ? entry.label : undefined}>
      <i aria-hidden="true" style={{ background: timelineColor(entry.color, darkMode) }} />{compact ? shortLabels[entry.id] : entry.label}
    </span>)}
  </div>;
}
