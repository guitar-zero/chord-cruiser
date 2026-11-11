import { trebleRoot } from './trebleRoot.js';

const letters = 'CDEFGAB';
const natural = [0, 2, 4, 5, 7, 9, 11];
const normalize = value => value.replaceAll('♭', 'b').replaceAll('♯', '#').replace('Δ', 'maj').replace('°', 'dim').replace('ø', 'm7b5');
const accidentalText = value => value === -2 ? '𝄫' : value === -1 ? '♭' : value === 1 ? '♯' : value === 2 ? '𝄪' : '';

export function staffChordFlavor(chord) {
  if (chord === 'NC') return 'N.C.';
  const quality = normalize(chord).split('/')[0].replace(/^[A-G][b#]?/, '');
  const label = quality === 'm7b5' ? 'half-dim7'
    : quality.startsWith('dim') ? quality
    : quality.startsWith('mMaj') ? quality.replace(/^mMaj/, 'min△')
    : quality.startsWith('maj') ? quality.replace(/^maj/, '△')
    : quality.startsWith('m') ? quality.replace(/^m/, 'min')
    : /^(7|9|11|13)/.test(quality) ? quality
    : quality.startsWith('sus') ? quality
    : `△${quality}`;
  return label.replaceAll('b', '♭').replaceAll('#', '♯');
}

export function staffNotePositions(notes) {
  return notes.map((note, index) => {
    const x = 140 + index * 280 / notes.length;
    return { ...note, x, accidentalX: x - 25 };
  });
}

// Compact written voicings, independent of the guitar/piano playback octaves.
export function staffChord(symbol) {
  const normalized = normalize(symbol);
  const match = /^([A-G])([b#]?)([^/]*)(?:\/([A-G])([b#]?))?$/.exec(normalized);
  if (!match) return [];
  const [, rootLetter, rootAccidental, quality, bassLetter, bassAccidental] = match;
  const rootIndex = letters.indexOf(rootLetter);
  const rootPitch = natural[rootIndex] + (rootAccidental === 'b' ? -1 : rootAccidental === '#' ? 1 : 0);
  const minor = /^m(?!aj)/.test(quality);
  const diminished = /dim|m7b5/.test(quality);
  let tones = [[1, 0], [/sus2/.test(quality) ? 2 : /sus/.test(quality) ? 4 : 3, /sus2/.test(quality) ? 2 : /sus/.test(quality) ? 5 : minor || diminished ? 3 : 4], [5, diminished || /b5/.test(quality) ? 6 : /#5/.test(quality) ? 8 : 7]];
  if (/maj7|mMaj7/.test(quality)) tones.push([7, 11]);
  else if (/dim7/.test(quality)) tones.push([7, 9]);
  else if (/7|9|11|13/.test(quality)) tones.push([7, 10]);
  else if (/6/.test(quality)) tones.push([6, 9]);
  const base = quality.replace(/[b#](?:5|9|11|13)/g, '');
  if (/9|11|13/.test(base)) tones.push([9, 14]);
  if (/11/.test(base)) tones.push([11, 17]);
  if (/13/.test(base)) tones.push([13, 21]);
  for (const alteration of quality.matchAll(/([b#])(9|11|13)/g)) {
    const degree = Number(alteration[2]);
    tones = tones.filter(([value]) => value !== degree);
    tones.push([degree, ({ 9: 14, 11: 17, 13: 21 }[degree]) + (alteration[1] === 'b' ? -1 : 1)]);
  }
  if (/alt/.test(quality)) tones = [...tones.filter(([degree]) => degree !== 5), [9, 13], [13, 20]];
  // Read root, third, fifth, seventh, then extensions, folding octaves into
  // the staff instead of changing which tone begins the arpeggio.
  tones.sort((a, b) => a[0] - b[0]);
  const root = trebleRoot(normalized);
  const rootStep = root.octave * 7 + rootIndex;
  const notes = tones.map(([degree, semitones]) => {
    const index = (rootIndex + degree - 1) % 7;
    const writtenPitch = natural[index] + Math.floor((rootIndex + degree - 1) / 7) * 12;
    const accidental = rootPitch + semitones - writtenPitch;
    const candidates = [4, 5].map(octave => octave * 7 + index).filter(step => step >= 30 && step <= 38);
    const step = degree === 1 ? rootStep : candidates.sort((a, b) => Math.abs(a - rootStep) - Math.abs(b - rootStep))[0];
    return { letter: letters[index], accidental: accidentalText(accidental), step, isRoot: degree === 1 };
  });
  if (bassLetter && !notes.some(note => note.letter === bassLetter && note.accidental === (bassAccidental === 'b' ? '♭' : bassAccidental === '#' ? '♯' : ''))) {
    const index = letters.indexOf(bassLetter);
    notes.push({ letter: bassLetter, accidental: bassAccidental === 'b' ? '♭' : bassAccidental === '#' ? '♯' : '', step: (index < 2 ? 5 : 4) * 7 + index, isRoot: false });
  }
  return notes;
}
