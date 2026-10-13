import { blackKeyHeightRatio } from './pianoPresentation.js';
import { notePitch } from './transpose.js';
import { routePath } from './stringLayout.js';

const whites = [0, 2, 4, 5, 7, 9, 11];
export const isBlackKey = midi => !whites.includes((midi % 12 + 12) % 12);
export function pianoKeyX(midi, width = 240) {
  const pitch = (midi % 12 + 12) % 12;
  const octave = Math.floor(midi / 12);
  const index = whites.filter(note => note < pitch).length;
  return (octave * 7 + index + (isBlackKey(midi) ? 0 : .5)) * width;
}

export function pianoLayout(source) {
  const nodes = [], sections = [], edges = [];
  let bottom = 0;
  for (const original of source.layout.sections) {
    const local = source.nodes.filter(node => node.section === original.id);
    const groups = Object.groupBy(local, node => notePitch(node.root));
    const top = bottom + 220, left = 200, width = 240;
    // Frame the central C3–B3 root octave with G2 on the left and E4 on the right.
    const firstKey = 43, lastKey = 64;
    const keyOrigin = pianoKeyX(firstKey, width) - width / 2;
    const keyboardWidth = pianoKeyX(lastKey, width) + width / 2 - keyOrigin;
    const maxVisits = black => Math.max(1, ...Object.values(groups).filter(group => isBlackKey(notePitch(group[0].root)) === black).map(group => group.length));
    // Reserve separate lanes on the black keys and the exposed white keys.
    const keyHeight = Math.ceil(Math.max((maxVisits(true) * 160 + 100) / blackKeyHeightRatio, (maxVisits(false) * 160 + 120) / (1 - blackKeyHeightRatio)));
    const keyboardTop = top + 100;
    const section = { ...original, instrument: 'piano', left, right: left + keyboardWidth,
      top: top + 100, bottom: keyboardTop + keyHeight, titleY: top, fretY: keyboardTop + keyHeight + 80,
      rows: [keyboardTop + 140, keyboardTop + keyHeight * blackKeyHeightRatio + 140], stringLabels: [], frets: Array.from({ length: 12 }, (_, i) => i),
      centers: Array.from({ length: 12 }, (_, i) => left + pianoKeyX(48 + i, width) - keyOrigin), boundaries: [],
      keyboardTop, keyHeight, firstKey, lastKey, keyOrigin, keyWidth: width, sideGutterLeft: 100, sideGutterRight: 100 };
    delete section.box;
    sections.push(section);
    for (const group of Object.values(groups)) group.forEach((node, i) => {
      const pitch = notePitch(node.root);
      nodes.push({ ...node, instrument: 'piano', string: 'Piano', fret: pitch, midi: 48 + pitch,
        x: left + pianoKeyX(48 + pitch, width) - keyOrigin, y: keyboardTop + (isBlackKey(pitch) ? 140 : keyHeight * blackKeyHeightRatio + 140) + i * 160,
        shape: 'circle', radius: 46, width: 0, height: 0, fontSize: Math.min(32, 110 / node.chord.length), textOffset: 4, badgeOffset: -68 });
    });
    const localNodes = nodes.filter(node => node.section === original.id);
    const byId = Object.fromEntries(localNodes.map(node => [node.id, node]));
    for (const edge of source.edges.filter(edge => edge.section === original.id)) {
      const rebuilt = { ...edge };
      delete rebuilt.path;
      if (byId[edge.source] && byId[edge.target]) rebuilt.path = routePath(byId[edge.source], byId[edge.target], localNodes, section);
      edges.push(rebuilt);
    }
    bottom = section.bottom + 180;
  }
  const byId = Object.fromEntries(nodes.map(node => [node.id, node]));
  const first = byId[source.startNodeId];
  return { ...source, instrument: 'piano', nodes: source.nodes.map(node => byId[node.id]), edges,
    description: `${source.title}: piano root movement directly on the keys, with a G2–E4 keyboard range.`,
    durationLabels: source.durationLabels.map(label => ({ ...label, offsetX: 65, offsetY: 55 })),
    layout: { ...source.layout, sections, viewBox: `0 0 ${Math.max(...sections.map(section => section.right)) + 200} ${bottom + 160}`, subtitle: `${source.key} · Piano root map`,
      annotations: [], legend: undefined, footerY: bottom + 100,
      startLabel: { x: first.x, y: first.y + 95 }, startOutline: { x: first.x - 55, y: first.y - 55, width: 110, height: 110 } },
    tip: { title: 'Piano map. ', text: 'Follow numbered chord visits directly on their root keys. The chord preview highlights a playable voicing; qualities sharing a root have separate nodes.' } };
}
