export const chordQualityPalette = [
  { id: 'major7', label: 'Major', color: '#267b99' },
  { id: 'minor7', label: 'Minor', color: '#8054bd' },
  { id: 'dominant', label: 'Dominant 7', color: '#d34b45' },
  { id: 'other', label: 'Diminished', color: '#13856b' },
];

export function chordQuality(chord = '') {
  const quality = chord.replaceAll('♭', 'b').replaceAll('♯', '#').split('/')[0].replace(/^[A-G][b#]?/, '');
  if (/m7b5|ø/.test(quality)) return 'halfDiminished';
  if (/dim|°/.test(quality)) return 'diminished';
  if (/sus/.test(quality)) return 'suspended';
  if (/^mMaj7|^mΔ7/.test(quality)) return 'minorMajor7';
  if (/^maj|^Δ/.test(quality)) return 'major7';
  if (/^m/.test(quality)) return /7|9|11|13/.test(quality) ? 'minor7' : 'minor';
  return /^(7|9|11|13)/.test(quality) ? 'dominant' : 'major';
}

export function chordQualityColor(chord) {
  const quality = chordQuality(chord);
  const family = ['major', 'suspended'].includes(quality) ? 'major7' : ['minor', 'minor7', 'minorMajor7', 'halfDiminished'].includes(quality) ? 'minor7' : quality;
  return (chordQualityPalette.find(entry => entry.id === family) || chordQualityPalette.find(entry => entry.id === 'other')).color;
}

export function chordDisplayColors(song, rainbowColors) {
  return song.nodeColorMode === 'quality' ? song.playback.map(event => chordQualityColor(event.chord)) : rainbowColors;
}
