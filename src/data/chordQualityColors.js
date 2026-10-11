export const chordQualityPalette = [
  { id: 'major', label: 'Major', color: '#29805d' },
  { id: 'minor', label: 'Minor', color: '#267b99' },
  { id: 'dominant', label: 'Dominant 7', color: '#cc480e' },
  { id: 'major7', label: 'Major 7', color: '#576b24' },
  { id: 'minor7', label: 'Minor 7', color: '#485aa3' },
  { id: 'diminished', label: 'Diminished', color: '#c43b32' },
  { id: 'halfDiminished', label: 'Half-dim', color: '#be3d6a' },
  { id: 'suspended', label: 'Suspended', color: '#a06a16' },
  { id: 'minorMajor7', label: 'Minor-major 7', color: '#8b4695' },
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
  return chordQualityPalette.find(entry => entry.id === chordQuality(chord)).color;
}

export function chordDisplayColors(song, rainbowColors) {
  return song.nodeColorMode === 'quality' ? song.playback.map(event => chordQualityColor(event.chord)) : rainbowColors;
}
