// Keep roots near the upper staff: E5 is the top space and F5 the top line.
// A4 and B4 keep every root at or below G5. Preserve written accidentals.
export function trebleRoot(chord) {
  const match = /^([A-G])([#♯b♭]?)/.exec(chord || '');
  if (!match) return null;
  const [, letter, accidental] = match;
  const octave = letter === 'A' || letter === 'B' ? 4 : 5;
  const y = { C: 36, D: 32, E: 28, F: 24, G: 20, A: 44, B: 40 }[letter];
  return { letter, accidental: accidental.replace('b', '♭').replace('#', '♯'), octave, y };
}
