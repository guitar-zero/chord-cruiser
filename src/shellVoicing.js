import { notePitch } from './data/transpose.js';

export const guitarStrings = ['E', 'A', 'D', 'G', 'B', 'e'];
export const guitarTuning = [40, 45, 50, 55, 59, 64];

// Keep the chart's bass position and choose compact, root-position shells.
export function shellVoicing(chord, node) {
  if (!node || chord === 'NC') return null;
  const match = chord.replaceAll('♭', 'b').replaceAll('♯', '#').split('/')[0].match(/^([A-G][b#]?)(.*)$/);
  const rootString = guitarStrings.indexOf(node.string);
  if (!match || rootString < 0 || rootString > 2 || !Number.isInteger(node.fret) || node.fret < 0) return null;
  const [, root, quality] = match;
  if (/sus/.test(quality)) return null;
  if ((guitarTuning[rootString] + node.fret) % 12 !== notePitch(root)) return null;
  const minor = /^m(?!aj)|dim/.test(quality);
  const third = minor ? 3 : 4;
  const seventh = /dim/.test(quality) ? 9 : /maj|Maj/.test(quality) || !quality || /^6/.test(quality) ? 11 : 10;
  const roles = ['R', minor ? '♭3' : '3', seventh === 9 ? '𝄫7' : seventh === 11 ? '7' : '♭7'];
  const rootNote = guitarTuning[rootString] + node.fret;
  const candidates = [];
  const pairs = rootString === 0 ? [[2, 3], [3, 4]] : rootString === 1 ? [[2, 3], [2, 4], [3, 4]] : [[3, 4], [3, 5], [4, 5]];
  for (const upperStrings of pairs) {
  for (const intervals of [[third, seventh], [seventh, third]]) {
    const options = upperStrings.map((string, i) => Array.from({ length: 25 }, (_, fret) => fret).filter(fret =>
      (guitarTuning[string] + fret - rootNote + 120) % 12 === intervals[i] && guitarTuning[string] + fret > rootNote));
    for (const a of options[0]) for (const b of options[1]) {
      const frets = [node.fret, a, b];
      const span = Math.max(...frets) - Math.min(...frets);
      candidates.push({ score: span * 10 + Math.abs(a - node.fret) + Math.abs(b - node.fret), notes: [
        { string: rootString, fret: node.fret, role: roles[0] },
        ...upperStrings.map((string, i) => ({ string, fret: [a, b][i], role: roles[intervals[i] === third ? 1 : 2] })),
      ] });
    }
  }
  }
  candidates.sort((a, b) => a.score - b.score);
  if (!candidates.length) return null;
  const hasSeventh = /7|9|11|13|dim/.test(quality);
  return { notes: candidates[0].notes, substitution: !hasSeventh, label: `${root}${seventh === 9 ? 'dim7' : `${minor ? 'm' : ''}${seventh === 11 ? 'maj7' : '7'}`}` };
}
