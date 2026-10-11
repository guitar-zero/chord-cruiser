import { guitarTuning } from '../shellVoicing.js';

export const pitchNames = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const templates = [
  ['', [0, 4, 7]], ['m', [0, 3, 7]], ['dim', [0, 3, 6]], ['aug', [0, 4, 8]],
  ['sus2', [0, 2, 7]], ['sus4', [0, 5, 7]],
  ['7', [0, 4, 7, 10]], ['maj7', [0, 4, 7, 11]], ['m7', [0, 3, 7, 10]],
  ['mMaj7', [0, 3, 7, 11]], ['m7♭5', [0, 3, 6, 10]], ['dim7', [0, 3, 6, 9]],
  ['6', [0, 4, 7, 9]], ['m6', [0, 3, 7, 9]],
  ['7 shell', [0, 4, 10]], ['maj7 shell', [0, 4, 11]], ['m7 shell', [0, 3, 10]],
  ['mMaj7 shell', [0, 3, 11]], ['dim7 shell', [0, 3, 9]],
];

// Estimate independently of the chart target; retain equally plausible names.
export function estimateHeardChord(pitches) {
  const played = [...new Set(pitches.map(pitch => (pitch % 12 + 12) % 12))];
  if (played.length < 3 || played.length > 6) return null;
  const candidates = [];
  for (let root = 0; root < 12; root++) for (const [quality, intervals] of templates) {
    const expected = intervals.map(interval => (root + interval) % 12);
    const matches = expected.filter(pitch => played.includes(pitch)).length;
    // Do not infer a chord from a missing third or seventh.
    if (matches !== expected.length) continue;
    const score = 2 * matches / (played.length + expected.length);
    if (score >= .85) candidates.push({ root, label: pitchNames[root] + quality, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  if (!candidates.length) return null;
  const best = candidates[0];
  return { ...best, alternatives: candidates.filter(candidate => candidate.score === best.score).slice(1).map(candidate => candidate.label) };
}

// Audio gives pitch classes, not string/fret positions. Find a compact example
// fingering for the notes we actually heard, including incomplete/wrong chords.
export function heardChordFingering(pitches, root) {
  const unique = [...new Set(pitches.map(pitch => (pitch % 12 + 12) % 12))];
  if (!unique.length || unique.length > 6) return [];
  if (root !== undefined) unique.sort((a, b) => Number(b === root) - Number(a === root));
  const score = notes => {
    const frets = notes.filter(note => note.fret > 0).map(note => note.fret);
    const span = frets.length ? Math.max(...frets) - Math.min(...frets) : 0;
    return span * 10 + notes.reduce((sum, note) => sum + note.fret * .2 + note.string * .1 + (note.pitch === root ? note.string : 0), 0);
  };
  let states = [[]];
  for (const pitch of unique) {
    const next = [];
    for (const notes of states) for (let string = 0; string < 6; string++) {
      if (notes.some(note => note.string === string)) continue;
      for (let fret = 0; fret <= 12; fret++) {
        if ((guitarTuning[string] + fret) % 12 !== pitch) continue;
        next.push([...notes, { string, fret, pitch, role: pitch === root ? 'R' : pitchNames[pitch] }]);
      }
    }
    next.sort((a, b) => score(a) - score(b));
    states = next.slice(0, 64);
  }
  return states[0] || [];
}

export class HeardChordTracker {
  key = '';
  shown = '';
  since = 0;
  lastSound = -Infinity;
  update(pitches, rms, now) {
    if (rms < .004 || !pitches.length) {
      this.key = '';
      if (this.shown && now - this.lastSound > 600) { this.shown = ''; return []; }
      return undefined;
    }
    this.lastSound = now;
    const notes = [...new Set(pitches)].sort((a, b) => a - b);
    const key = notes.join(',');
    if (key !== this.key) { this.key = key; this.since = now; }
    if (now - this.since >= 120 && key !== this.shown) { this.shown = key; return notes; }
    return undefined;
  }
}
