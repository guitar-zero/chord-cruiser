import { rainbowChoices } from './routePalette.js';

// Consecutive split-bar changes form one rapid passage, including turnarounds.
export function rapidPassage(song, visitIndex) {
  const quick = index => song.playback[index]?.bars > 0 && song.playback[index].bars < 1;
  if (!Number.isInteger(visitIndex) || visitIndex < 0) return null;
  const upcomingIndex = quick(visitIndex) ? visitIndex : visitIndex + 1;
  if (!quick(upcomingIndex)) return null;
  let start = upcomingIndex, end = upcomingIndex;
  while (quick(start - 1)) start--;
  while (quick(end + 1)) end++;
  return end > start ? { start, end } : null;
}

export function rapidPassageMovements(song, visitIndex) {
  const passage = rapidPassage(song, visitIndex);
  if (!passage) return [];
  return Array.from({ length: passage.end - passage.start + 1 }, (_, offset) => {
    const sourceVisitIndex = passage.start + offset;
    const movement = upcomingMovement(song, sourceVisitIndex);
    return movement?.edgeId ? { ...movement, sourceVisitIndex } : null;
  }).filter(Boolean);
}

export function quickChangeRanges(events) {
  const ranges = [];
  for (let index = 0; index < events.length; index++) {
    const passage = rapidPassage({ playback: events }, index);
    if (passage?.start === index) {
      ranges.push(passage);
      index = passage.end;
    }
  }
  return ranges;
}

export function nearbyPlaybackNodes(song, visitIndex = 0, visibleSteps = 3) {
  const count = song.playback.length;
  const current = Number.isInteger(visitIndex) && visitIndex >= 0 ? visitIndex : 0;
  const indices = Array.from({ length: visibleSteps }, (_, offset) => (current + offset) % count);
  const passage = rapidPassage(song, current);
  if (passage && current >= passage.start && current <= passage.end) {
    for (let index = passage.start; index <= passage.end + 1; index++) indices.push(index % count);
  }
  return new Set(indices.flatMap(index => song.playback[index]?.nodeIds || [song.playback[index]?.nodeId]).filter(Boolean));
}

export function upcomingMovement(song, visitIndex) {
  if (!Number.isInteger(visitIndex) || visitIndex < 0) return null;
  const current = song.playback[visitIndex];
  const next = song.playback[visitIndex + 1];
  if (!current?.nodeId || !next?.nodeId || current.nodeId === next.nodeId) return null;
  const edge = song.edges.find(edge => edge.source === current.nodeId && edge.target === next.nodeId);
  return { nodeId: next.nodeId, edgeId: edge?.id, visitIndex: visitIndex + 1 };
}

export function nodeVisitColors(song, colors, visitIndex = -1) {
  const result = {};
  song.playback.forEach((event, index) => {
    for (const nodeId of event.nodeIds || [event.nodeId]) {
      if (nodeId && colors[index] && (!result[nodeId] || index <= visitIndex)) result[nodeId] = colors[index];
    }
  });
  return result;
}

// A hold is one visit; a return to the chord is another numbered visit.
export function nodeVisits(song) {
  const visits = Object.fromEntries(song.nodes.map(node => [node.id, []]));
  song.playback.forEach((event, index) => {
    for (const nodeId of event.nodeIds || [event.nodeId]) {
      if (visits[nodeId]) visits[nodeId].push(index + 1);
    }
  });
  return visits;
}

export function branchColors(song, section, palette) {
  const edges = song.edges.filter(edge => edge.section === section.id);
  const firstVisit = edge => {
    if (Number.isInteger(edge.firstVisit)) return edge.firstVisit;
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
