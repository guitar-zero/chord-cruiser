import React from 'react';
import { createPortal } from 'react-dom';
import { countInLabel } from './audio/countIn.js';

export default function GameCountIn({ beat, beatSeconds, starting, paused, firstChord, nextChord, go }) {
  const label = go ? 'GO!' : starting ? 'Get ready' : countInLabel(beat, beatSeconds);
  if (!label) return null;
  const phase = go ? 'go' : label === 'Get ready' ? 'ready' : label === 'Here we go' ? 'anticipation' : 'countdown';
  return createPortal(<div className="game-count-in-overlay" data-phase={phase} role="status" aria-live="assertive" aria-atomic="true">
    <div className="game-count-in-card">
      <span className="game-count-in-eyebrow">✦ GUITAR GAME ✦</span>
      {firstChord && <div className="game-count-in-chords">
        <p>{go ? 'Play now' : 'Get ready to play'} <strong>{firstChord.replaceAll('b', '♭').replaceAll('#', '♯')}!</strong></p>
        {nextChord && <span>then <b>{nextChord.replaceAll('b', '♭').replaceAll('#', '♯')}</b></span>}
      </div>}
      <strong key={label} className={`game-count-in-cue${go || (!starting && beat <= 8) ? ' is-number' : ''}`}>{label}</strong>
      <div className="game-count-in-dots" aria-hidden="true">{[8, 7, 6, 5, 4, 3, 2, 1].map(value => <span key={value} className={beat === value && !go ? 'is-current' : (beat < value && !starting) || go ? 'is-done' : ''}>{value}</span>)}</div>
      <span>{paused ? 'Paused · press Resume to continue' : starting ? 'Preparing the music…' : go ? 'Strum your first chord!' : 'Eight beats to get settled · play on GO!'}</span>
    </div>
  </div>, document.body);
}
