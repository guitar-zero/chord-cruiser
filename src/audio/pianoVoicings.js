import { chordNotes } from './songs.js';

export function pianoVoicing(chord, repeat = 0) {
  const notes = chordNotes(chord);
  // Keep an explicitly requested slash bass in place.
  const bass = chord.includes('/') ? notes.shift() : null;
  const turns = notes.length ? repeat % notes.length : 0;
  for (let turn = 0; turn < turns; turn++) {
    notes.sort((a, b) => a - b);
    notes[0] += 12;
  }
  notes.sort((a, b) => a - b);
  return bass === null ? notes : [bass, ...notes];
}

export function pianoHits(timeline, { nodesOnly = false } = {}) {
  const hits = [];
  const beatSeconds = timeline.duration / timeline.beats;
  const beatsPerBar = timeline.beatsPerBar || 4;
  let previousChord;
  let repeat = 0;
  for (const event of timeline.events) {
    if (event.chord === 'NC') { previousChord = undefined; continue; }
    if (nodesOnly && !event.nodeId) continue;
    const hitBeats = nodesOnly ? event.beats : beatsPerBar;
    for (let beat = 0; beat < event.beats; beat += hitBeats) {
      repeat = previousChord === event.chord ? repeat + 1 : 0;
      hits.push({ chord: event.chord, start: event.start + beat * beatSeconds,
        duration: Math.min(hitBeats, event.beats - beat) * beatSeconds,
        notes: pianoVoicing(event.chord, repeat) });
      previousChord = event.chord;
    }
  }
  return hits;
}
