import { songs } from '../data/songs.js';

export const playbackSongs = Object.fromEntries(songs.map(song => [song.id, song.playback]));

export function buildTimeline(events, bpm, beatsPerBar = 4) {
  if (!Number.isFinite(bpm) || bpm <= 0) throw Error('Tempo must be positive.');
  if (!Number.isInteger(beatsPerBar) || beatsPerBar <= 0) throw Error('Beats per bar must be positive.');
  let beats = 0;
  const timeline = events.map(e => {
    const startBeat = beats;
    beats += e.bars * beatsPerBar;
    return { ...e, startBeat, beats: e.bars * beatsPerBar, start: startBeat * 60 / bpm, duration: e.bars * beatsPerBar * 60 / bpm };
  });
  return { events: timeline, beats, beatsPerBar, duration: beats * 60 / bpm };
}

export function chordNotes(chord) {
  if (chord === 'NC') return [];
  const [symbol, inversion] = chord.split('/');
  const match = symbol.match(/^([A-G])([b#]?)(.*)$/);
  if (!match) throw Error(`Unknown chord: ${chord}`);
  const [, letter, accidental, quality] = match;
  const pitch = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0) + 12) % 12;
  const root = 48 + pitch;
  const intervals = quality === '' ? [0, 12, 16, 19]
    : quality === 'm' ? [0, 12, 15, 19]
    : quality === '7#9b5' ? [0, 10, 16, 18, 27]
    : quality === '7#9' ? [0, 10, 16, 27]
    : quality === 'dim7' ? [0, 9, 15, 18]
    : quality === 'm7b5' ? [0, 10, 15, 18]
    : quality === 'mMaj7' ? [0, 11, 15, 19]
    : quality === 'm6' ? [0, 9, 15, 19]
    : quality === 'm7' ? [0, 10, 15, 19]
    : quality === 'maj7' ? [0, 11, 16, 19]
    : quality === '6' ? [0, 9, 16, 19]
    : quality === '7b9' ? [0, 10, 16, 25]
    : quality === '7b13' ? [0, 10, 16, 20]
    : quality === '7' ? [0, 10, 16, 19] : extendedIntervals(quality);
  if (!intervals) throw Error(`Unsupported quality: ${chord}`);
  const notes = intervals.map(interval => root + interval);
  if (inversion) {
    const match = inversion.match(/^([A-G])([b#]?)$/);
    if (!match) throw Error(`Unsupported inversion: ${chord}`);
    const [, letter, accidental] = match;
    const pitch = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0) + 12) % 12;
    notes[0] = 36 + pitch;
  }
  return notes;
}

export function bassNote(chord) {
  if (chord === 'NC') return null;
  return chordNotes(chord.split('/')[0])[0] - 7;
}

// Extensions are kept in the piano voicing, including combinations and sus chords.
function extendedIntervals(quality) {
  if (!/^(?:mMaj7|maj7|m|7|9|11|13|6|sus4|sus2)(?:[0-9]|b|#|alt|sus4|sus2|sus|add)*$/.test(quality)) return null;
  const minor = /^m(?!aj)/.test(quality);
  const major = /^maj7/.test(quality) || /^mMaj7/.test(quality);
  const suspended = /sus/.test(quality);
  let notes = [0, major ? 11 : /^(?:m|7|9|11|13)/.test(quality) ? 10 : 9, suspended ? /sus2/.test(quality) ? 14 : 17 : minor ? 15 : 16, 19];
  if (/b5/.test(quality)) notes = notes.map(n => n === 19 ? 18 : n);
  if (/#5/.test(quality)) notes = notes.map(n => n === 19 ? 20 : n);
  if (/b9/.test(quality)) notes.push(25);
  if (/#9/.test(quality)) notes.push(27);
  if (/#11/.test(quality)) notes.push(30);
  if (/b13/.test(quality)) notes.push(32);
  const base = quality.replace(/(?:b|#)(?:5|9|11|13)/g,'');
  if (/(?:9|11|13)/.test(base)) notes.push(26);
  if (/11/.test(base)) notes.push(29);
  if (/13/.test(base)) notes.push(33);
  if (/alt/.test(quality)) { notes = notes.filter(n => n !== 19); notes.push(25,32); }
  return [...new Set(notes)];
}
