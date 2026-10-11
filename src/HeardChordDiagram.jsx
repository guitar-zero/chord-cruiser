import React, { useMemo } from 'react';
import FretboardDiagram from './FretboardDiagram.jsx';
import MiniFretboardDiagram from './MiniFretboardDiagram.jsx';
import { estimateHeardChord, heardChordFingering, pitchNames } from './audio/heardChord.js';

export default function HeardChordDiagram({ pitches, connected, darkMode, compact = false, heading = 'Heard on guitar' }) {
  const estimate = useMemo(() => estimateHeardChord(pitches), [pitches]);
  const notes = useMemo(() => heardChordFingering(pitches, estimate?.root), [pitches, estimate]);
  const names = pitches.map(pitch => pitchNames[pitch]).join(' · ');
  const label = !connected ? 'Connect your guitar' : !pitches.length ? 'Listening for your guitar…' : estimate ? `${estimate.score < 1 ? 'Possibly ' : ''}${estimate.label}` : 'Notes detected · chord uncertain';
  const Diagram = compact ? MiniFretboardDiagram : FretboardDiagram;
  return <section className={`game-heard-chord${compact ? ' is-compact' : ''}`} aria-label="Live guitar chord estimate">
    <div className="game-heard-heading"><strong><span aria-hidden="true">♫ </span>{heading}</strong><span>{label}</span></div>
    <Diagram notes={notes} darkMode={darkMode} label={pitches.length ? `Detected notes: ${names}. Example fingering${estimate ? ` for ${estimate.label}` : ''}.` : 'Listening fretboard: no detected guitar notes'} />
    <p>{names || 'Play a chord to see the detected notes.'}{estimate?.alternatives.length > 0 && ` · Also possible: ${estimate.alternatives.join(', ')}`}</p>
    <small>{compact ? 'Detected notes · example fingering' : 'Example fingering for the detected notes; audio does not identify which strings or frets you used.'}</small>
  </section>;
}
