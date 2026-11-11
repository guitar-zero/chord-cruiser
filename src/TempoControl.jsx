import React from 'react';

export default function TempoControl({ bpm, onChange, disabled }) {
  return <label className="tempo-control" title={disabled ? 'Stop playback before changing tempo.' : 'Tempo shortcuts: 0–3 set 100–130 BPM; 4–9 set 40–90 BPM.'}>
    Tempo{' '}
    <input type="number" min="40" max="240" step="5" value={bpm} disabled={disabled}
      aria-keyshortcuts="0 1 2 3 4 5 6 7 8 9" onChange={event => onChange(event.target.value)} />{' '}
    BPM
  </label>;
}
