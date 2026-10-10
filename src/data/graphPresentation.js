import { rainbowChoices } from './routePalette.js';

// A hold is one visit; a return to the chord is another numbered visit.
export function nodeVisits(song) {
  const visits = Object.fromEntries(song.nodes.map(node => [node.id, []]));
  song.playback.forEach((event, index) => {
    if (visits[event.nodeId]) visits[event.nodeId].push(index + 1);
  });
  return visits;
}

export function branchColors(song, section, palette) {
  const edges = song.edges.filter(edge => edge.section === section.id);
  const firstVisit = edge => {
    const index = song.playback.findIndex((event, i) => event.nodeId === edge.source && song.playback[i + 1]?.nodeId === edge.target);
    return index < 0 ? Infinity : index;
  };
  const colors = {};
  for (const source of new Set(edges.map(edge => edge.source))) {
    const outgoing = edges.filter(edge => edge.source === source).sort((a,b) => firstVisit(a) - firstVisit(b));
    const destinations = [...new Set(outgoing.map(edge => edge.target))];
    if (destinations.length < 2) continue;
    const base = section.color || '#c43b32';
    const choices = rainbowChoices(base, palette);
    outgoing.forEach(edge => { colors[edge.id] = choices[destinations.indexOf(edge.target)]; });
  }
  return colors;
}
