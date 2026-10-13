import { notePitch } from './transpose.js';

export const blackKeyHeightRatio = .42;
export function pianoChordKeys(chord) {
  if (!chord || chord === 'NC') return { notes: [], pitches: [], rootPitch: undefined, rootMidi: undefined };
  const rootPitch = notePitch(chord), rootMidi = 48 + rootPitch;
  const quality = chord.replaceAll('♭', 'b').replaceAll('♯', '#').split('/')[0].replace(/^[A-G][b#]?/, '');
  const minor = /^m(?!aj)|dim|°|ø/.test(quality);
  const third = minor ? 3 : 4;
  const seventh = /dim|°/.test(quality) ? 9 : /maj|Maj|Δ/.test(quality) || !quality || /^6/.test(quality) ? 11 : 10;
  const options = [];
  for (const thirdOffset of [third, third - 12]) for (const seventhOffset of [seventh, seventh - 12]) {
    const notes = [rootMidi, rootMidi + thirdOffset, rootMidi + seventhOffset];
    options.push({ notes, span: Math.max(...notes) - Math.min(...notes), distance: Math.abs(thirdOffset) + Math.abs(seventhOffset) });
  }
  options.sort((a,b) => a.span - b.span || a.distance - b.distance);
  const notes = options[0].notes.sort((a,b) => a-b);
  return { notes, pitches: notes.map(note => note % 12), rootPitch, rootMidi, substitution: /sus/.test(quality) || !/7|9|11|13|dim|°|ø/.test(quality) };
}
export function pianoPlaybackKeys(song, index, sectionId) {
  if (!Number.isInteger(index) || index < 0) return { notes: [], pitches: [] };
  const event = song.playback[index], next = song.playback[index + 1];
  const belongs = event => event && song.nodes.find(node => node.id === event.nodeId)?.section === sectionId;
  const active = belongs(event) ? pianoChordKeys(event.chord) : { notes: [], pitches: [] };
  const nextKeys = belongs(next) ? pianoChordKeys(next.chord) : {};
  return { ...active, nextNotes: nextKeys.notes || [], nextRootPitch: nextKeys.rootPitch, nextRootMidi: nextKeys.rootMidi };
}

export function pianoRootPipe(currentX, nextX, width, y) {
  const stacked = Math.abs(nextX - currentX) < width * .85;
  const currentY = y, nextY = stacked ? y + width * .5 : y;
  const badgeHeight = width * .25;
  const direction = Math.sign(nextX - currentX) || 1;
  const path = stacked
    ? `M${currentX} ${currentY + badgeHeight + 8} L${nextX} ${nextY - 8}`
    : `M${currentX + direction * (width * .33 + 8)} ${y + badgeHeight / 2} L${nextX - direction * (width * .33 + 8)} ${y + badgeHeight / 2}`;
  return { currentY, nextY, path };
}

export function neonPianoColor(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) return color;
  const channels = [1,3,5].map(start => parseInt(color.slice(start, start + 2), 16));
  const low = Math.min(...channels), high = Math.max(...channels);
  if (high === low) return '#e5ffff';
  // Preserve hue while increasing brightness and saturation.
  return '#' + channels.map(channel => Math.round(35 + (channel - low) / (high - low) * 220).toString(16).padStart(2, '0')).join('');
}
