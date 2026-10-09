export function chartTarget(song, event) {
  if (!event) return null;
  if (song === 'autumn-leaves') return { node: ({ Dm7: 'Dm', G7: 'G7', Cmaj7: 'C', Fmaj7: 'F', Bm7b5: 'B°', E7b13: 'E7', Am6: 'Am' })[event.chord] || 'unmapped' };
  if (song === 'solar') return { node: ({ CmMaj7: 'cm', Gm7: 'gm', C7: 'c7', Fmaj7: 'f', Fm7: 'fm', Bb7: 'bb7', Ebmaj7: 'eb', Ebm7: 'ebm', Ab7: 'ab7', Dbmaj7: 'db', Dm7b5: 'ddim', G7b9: 'g7' })[event.chord] || 'unmapped' };
  return { node: ({ C6: 'start', F6: 'start', D7: 'd7', Dm7: 'dm', G7: 'g7' })[event.chord] || 'unmapped', section: event.section === 'Verse' ? 'verse' : 'chorus' };
}
