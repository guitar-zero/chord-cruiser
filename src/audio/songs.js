const event = (chord, bars = 1, section = '') => ({ chord, bars, section });
const verseA = ending => [event('C6', 2), event('D7', 2), event('Dm7'), event('G7'), event('C6'), ...ending.map(chord => event(chord, .5))];
export const playbackSongs = {
  'autumn-leaves': [event('Dm7'), event('G7'), event('Cmaj7'), event('Fmaj7'), event('Bm7b5'), event('E7b13'), event('Am6', 2)],
  solar: [event('CmMaj7', 2), event('Gm7'), event('C7'), event('Fmaj7', 2), event('Fm7'), event('Bb7'), event('Ebmaj7'), event('Ebm7', .5), event('Ab7', .5), event('Dbmaj7'), event('Dm7b5', .5), event('G7b9', .5)],
  'take-the-a-train': [
    ...verseA(['Dm7', 'G7']).map(e => ({ ...e, section: 'Chorus · first pass' })),
    ...verseA(['Gm7', 'C7']).map(e => ({ ...e, section: 'Chorus · second pass' })),
    ...[event('F6', 4), event('D7', 2), event('Dm7'), event('G7')].map(e => ({ ...e, section: 'Verse' })),
    ...verseA(['Dm7', 'G7']).map(e => ({ ...e, section: 'Final chorus' })),
  ],
};

export function buildTimeline(events, bpm) {
  if (!Number.isFinite(bpm) || bpm <= 0) throw Error('Tempo must be positive.');
  let beats = 0;
  const timeline = events.map(e => {
    const startBeat = beats;
    beats += e.bars * 4;
    return { ...e, startBeat, beats: e.bars * 4, start: startBeat * 60 / bpm, duration: e.bars * 4 * 60 / bpm };
  });
  return { events: timeline, beats, duration: beats * 60 / bpm };
}

export function chordNotes(chord) {
  const match = chord.match(/^([A-G])([b#]?)(.*)$/);
  if (!match) throw Error(`Unknown chord: ${chord}`);
  const [, letter, accidental, quality] = match;
  const pitch = ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter] + (accidental === 'b' ? -1 : accidental === '#' ? 1 : 0) + 12) % 12;
  const root = 48 + pitch;
  const intervals = quality === 'm7b5' ? [0, 10, 15, 18]
    : quality === 'mMaj7' ? [0, 11, 15, 19]
    : quality === 'm6' ? [0, 9, 15, 19]
    : quality === 'm7' ? [0, 10, 15, 19]
    : quality === 'maj7' ? [0, 11, 16, 19]
    : quality === '6' ? [0, 9, 16, 19]
    : quality === '7b9' ? [0, 10, 16, 25]
    : quality === '7b13' ? [0, 10, 16, 20]
    : quality === '7' ? [0, 10, 16, 19] : null;
  if (!intervals) throw Error(`Unsupported quality: ${chord}`);
  return intervals.map(interval => root + interval);
}

export function bassNote(chord) {
  return chordNotes(chord)[0] - 7;
}
