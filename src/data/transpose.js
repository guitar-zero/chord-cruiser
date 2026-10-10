const pitches = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const sharpNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const keyRoots = flatNames;
export const minorKeyRoots = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const mod = value => (value % 12 + 12) % 12;
export const displayNote = note => note.replaceAll('b', '♭').replaceAll('#', '♯');

export function notePitch(note) {
  const match = note.match(/^([A-G])([b#♭♯]?)/);
  if (!match) throw Error(`Unknown note: ${note}`);
  return mod(pitches[match[1]] + (/[b♭]/.test(match[2]) ? -1 : /[#♯]/.test(match[2]) ? 1 : 0));
}

export function transposeChord(chord, semitones, preferSharps = false) {
  if (chord === 'NC') return chord;
  const names = preferSharps ? sharpNames : flatNames;
  // Only the chord root and slash bass change; qualities and alterations stay intact.
  return chord.split('/').map(part => part.replace(/^([A-G][b#♭♯]?)/, root => {
    const name = names[mod(notePitch(root) + semitones)];
    return /[♭♯]/.test(root) ? displayNote(name) : name;
  })).join('/');
}

export function transposeSong(source, targetRoot) {
  if (!targetRoot || notePitch(targetRoot) === notePitch(source.key)) return source;
  let shift = mod(notePitch(targetRoot) - notePitch(source.key));
  if (shift > 6) shift -= 12;
  // Slide the entire map together along the neck, preserving all measured routes.
  const lowestFret = Math.min(...source.layout.sections.flatMap(section => section.frets));
  if (lowestFret + shift < 1) shift += 12;
  const minor = /minor|-$/.test(source.key);
  const key = `${displayNote(targetRoot)}${minor ? ' minor' : ''}`;
  const preferSharps = (minor ? ['E','B','F#','C#','G#','D#','A#'] : ['G','D','A','E','B','F#','C#']).includes(targetRoot);
  const transpose = chord => transposeChord(chord, shift, preferSharps);
  const nodes = source.nodes.map(node => {
    const chord = displayNote(transpose(node.chord));
    return { ...node, chord, root: displayNote(transpose(node.root)), fret: node.fret + shift, fontSize: Math.min(node.fontSize || 35, (node.radius || 46) * 2.4 / chord.length) };
  });
  const sections = source.layout.sections.map(section => ({ ...section, frets: section.frets.map(fret => fret + shift) }));
  const frets = sections.flatMap(section => section.frets);
  const bars = Number(source.playback.reduce((total,event) => total + event.bars,0).toFixed(6));
  return {
    ...source, key, nodes,
    description: `${source.title} in ${key}. Chord roots on the three lowest guitar strings; numbered frets show the transposed positions.`,
    tip: { title: 'Transposed fretboard. ', text: `Follow the visit numbers in ${key}. Chord qualities, durations, and string spacing are preserved; fret labels show the new root positions. ${source.sourceNote || ''}` },
    playback: source.playback.map(event => ({ ...event, chord: transpose(event.chord) })),
    layout: { ...source.layout, sections, subtitle: `${key} · ${bars} bars · ${source.beatsPerBar || 4}/4 · Frets ${Math.min(...frets)}–${Math.max(...frets)}`, footer: source.layout.footer.includes('→') ? source.layout.footer.split(' → ').map(transpose).join(' → ') : source.layout.footer },
    playbackNote: `Transposed from ${source.key} to ${key}. ${source.playbackNote || ''}`,
    footerNote: `Transposed from ${source.key} to ${key}. ${source.footerNote || ''}`,
  };
}
