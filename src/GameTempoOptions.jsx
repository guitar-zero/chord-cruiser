import React, { useId } from 'react';

const tempos = [{ label: 'Easy', bpm: 80, icon: '♡' }, { label: 'Normal', bpm: 120, icon: '♫' }, { label: 'Fast', bpm: 160, icon: '⚡' }];

export default function GameTempoOptions({ bpm, onChange, disabled = false }) {
  const name = useId();
  return <fieldset className="game-tempo-options" disabled={disabled}>
    <legend>Pick your pace</legend>
    <div>{tempos.map(tempo => <label key={tempo.bpm} className={bpm === tempo.bpm ? 'is-selected' : ''}>
      <input type="radio" name={name} value={tempo.bpm} checked={bpm === tempo.bpm} onChange={() => onChange(tempo.bpm)} />
      <span aria-hidden="true">{tempo.icon}</span><strong>{tempo.label}</strong><small>{tempo.bpm} BPM</small>
    </label>)}</div>
  </fieldset>;
}
