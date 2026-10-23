// Reserve headings above the board and fret labels below all chart content.
export function sectionHeaderPositions(song, sectionId) {
  const section=song.layout.sections.find(item=>item.id===sectionId);
  const nodes=song.nodes.filter(node=>node.section===sectionId);
  const points=song.edges.filter(edge=>edge.section===sectionId && edge.path).flatMap(edge=>routeVertices(edge.path));
  const titleY=Math.min(section.top-95,...nodes.map(node=>node.y+(node.badgeOffset ?? -68)-80),...points.map(point=>point.y-95));
  const durations=(song.durationLabels || []).filter(label=>nodes.some(node=>node.id===label.nodeId)).map(label=>nodes.find(node=>node.id===label.nodeId).y+(label.offsetY || 0));
  const fretY=Math.max(section.bottom+(section.instrument === 'piano' ? 310 : 90),...nodes.map(node=>node.y+195),...durations.map(y=>y+70),...points.map(point=>point.y+95));
  return {fretY,titleY};
}

// Crop an existing measured section rather than changing its node/path geometry.
export function sectionViewport(song, sectionId) {
  const section = song.layout.sections.find(item => item.id === sectionId);
  if (!section) return song.layout.viewBox;
  const nodes = song.nodes.filter(node => node.section === sectionId);
  const routePoints = song.edges.filter(edge => edge.section === sectionId && edge.path).flatMap(edge => routeVertices(edge.path));
  // String labels are content; retain their width even with gutters disabled.
  const left = Math.min(section.left - (song.layout.noGutters ? 110 : section.sideGutterLeft ?? 190), ...nodes.map(node => node.x - 100), ...routePoints.map(point => point.x - 65));
  const right = Math.max(section.right + (song.layout.noGutters ? 4 : section.sideGutterRight ?? 190), ...nodes.map(node => node.x + 100), ...routePoints.map(point => point.x + 65));
  const header=sectionHeaderPositions(song,sectionId);
  const top = Math.min(header.titleY - (song.layout.noGutters ? 40 : 65), header.fretY - 65, ...nodes.map(node => node.y + (node.badgeOffset || -68) - 50), ...routePoints.map(point => point.y - 65));
  const bottom = Math.max(header.fretY + (song.layout.noGutters ? 45 : 90), section.bottom + 170, ...nodes.map(node => node.y + 180), ...routePoints.map(point => point.y + 65));
  return `${left} ${top} ${right-left} ${bottom-top}`;
}
import { routeVertices } from './reciprocalRoutes.js';


// Express the destination's framing in the current board's fret coordinates.
export function alignedSectionViewport(song, sourceId, destinationId) {
  const source = song.layout.sections.find(section => section.id === sourceId);
  const destination = song.layout.sections.find(section => section.id === destinationId);
  const fallback = sectionViewport(song, sourceId);
  if (!source?.centers || !destination?.centers || source.centers.length < 2 || destination.centers.length < 2) return fallback;
  const spacing = section => (section.centers.at(-1) - section.centers[0]) / (section.frets.at(-1) - section.frets[0]);
  const sourceSpacing = spacing(source);
  const destinationSpacing = spacing(destination);
  const [x, , width] = sectionViewport(song, destinationId).split(' ').map(Number);
  const [, y, , height] = fallback.split(' ').map(Number);
  const scale = sourceSpacing / destinationSpacing;
  const mappedX = source.centers[0] + (destination.frets[0] - source.frets[0]) * sourceSpacing + (x - destination.centers[0]) * scale;
  return [mappedX, y, width * scale, height].every(Number.isFinite)
    ? `${mappedX} ${y} ${width * scale} ${height}` : fallback;
}
