import { threeStringLayout } from './threeStringLayout.js';

// Tighten horizontal spacing, then extend the board around the current map.
// Each section is displayed in its own measured viewport.
export function fullFretboardLayout(song) {
  if (song.layout.sections.every(section => section.instrument === 'piano')) return song;
  song = threeStringLayout(song, .8);
  const sections = song.layout.sections.map(section => {
    if (section.instrument === 'piano') return section;
    const spacing = section.boundaries[1] - section.boundaries[0];
    const left = section.left - (section.frets[0] - 1) * spacing;
    const lastFret = 12;
    return {
      ...section,
      showHeadstock: true,
      left,
      right: left + lastFret * spacing,
      frets: Array.from({ length: lastFret }, (_, i) => i + 1),
      centers: Array.from({ length: lastFret }, (_, i) => left + (i + .5) * spacing),
      boundaries: Array.from({ length: lastFret + 1 }, (_, i) => left + i * spacing),
    };
  });
  return { ...song, layout: { ...song.layout, sections } };
}
