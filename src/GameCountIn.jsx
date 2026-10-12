import React from 'react';
import { createPortal } from 'react-dom';
import { countInLabel } from './audio/countIn.js';
import CountInChordNode from './CountInChordNode.jsx';
import ShellChordDiagram from './ShellChordDiagram.jsx';
import { darkerTimelineColor } from './data/timelinePresentation.js';

export default function GameCountIn({ beat, beatSeconds, starting, paused, firstChord, nextChord, firstShape, firstNode, firstColor, darkMode, go }) {
  const label = go ? 'GO!' : starting ? 'Get ready' : countInLabel(beat, beatSeconds);
  if (!label || go) return null;
  const phase = go ? 'go' : label === 'Get ready' ? 'ready' : label === 'Here we go' ? 'anticipation' : 'countdown';
  return createPortal(<div className="game-count-in-overlay" data-phase={phase} style={firstColor ? { '--count-in-chord-color': firstColor, '--count-in-chord-border': darkerTimelineColor(firstColor) } : undefined} role="status" aria-live="assertive" aria-atomic="true">
    <div className={`game-count-in-card${firstNode ? ' has-fretboard' : ''}`}>
      <span className="game-count-in-eyebrow">✦ GUITAR GAME ✦</span>
      {firstChord && <div className="game-count-in-chords">
        <p>{go ? 'Play now' : 'First chord is'}</p>
        <CountInChordNode chord={firstChord} shape={firstShape} color={firstColor} darkMode={darkMode} />
        {nextChord && <span>then <b>{nextChord.replaceAll('b', '♭').replaceAll('#', '♯')}</b></span>}
      </div>}
      {firstNode && <div className="count-in-fretboard"><ShellChordDiagram fullFretboard chord={firstChord} node={firstNode} color={firstColor} darkMode={darkMode} showOrientationToggle={false} showDetails={false} /></div>}
      <strong key={label} className={`game-count-in-cue${go || (!starting && beat <= 8) ? ' is-number' : ''}`}>{label}</strong>
      {!starting && !go && beat > 0 && beat <= 8 && <div className="game-count-in-dots" aria-hidden="true">{[8, 7, 6, 5, 4, 3, 2, 1].map(value => <span key={value} className={beat === value ? 'is-current' : beat < value ? 'is-done' : ''}>{value}</span>)}</div>}
      <span>{paused ? 'Paused · press Resume to continue' : starting ? 'Preparing the music…' : go ? 'Strum your first chord!' : 'Eight beats to get settled · play on GO!'}</span>
    </div>
  </div>, document.body);
}
