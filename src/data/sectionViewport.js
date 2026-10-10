// Reserve headings above the board and fret labels below all chart content.
export function sectionHeaderPositions(song, sectionId) {
  const section=song.layout.sections.find(item=>item.id===sectionId);
  const nodes=song.nodes.filter(node=>node.section===sectionId);
  const points=song.edges.filter(edge=>edge.section===sectionId && edge.path).flatMap(edge=>routeVertices(edge.path));
  const titleY=Math.min(section.top-95,...nodes.map(node=>node.y+(node.badgeOffset ?? -68)-80),...points.map(point=>point.y-95));
  const durations=(song.durationLabels || []).filter(label=>nodes.some(node=>node.id===label.nodeId)).map(label=>nodes.find(node=>node.id===label.nodeId).y+(label.offsetY || 0));
  const fretY=Math.max(section.bottom+90,...nodes.map(node=>node.y+195),...durations.map(y=>y+70),...points.map(point=>point.y+95));
  return {fretY,titleY};
}

// Crop an existing measured section rather than changing its node/path geometry.
export function sectionViewport(song, sectionId) {
  const section = song.layout.sections.find(item => item.id === sectionId);
  if (!section) return song.layout.viewBox;
  const nodes = song.nodes.filter(node => node.section === sectionId);
  const routePoints = song.edges.filter(edge => edge.section === sectionId && edge.path).flatMap(edge => routeVertices(edge.path));
  const left = Math.min(section.left - (section.sideGutterLeft ?? 190), ...nodes.map(node => node.x - 100), ...routePoints.map(point => point.x - 65));
  const right = Math.max(section.right + (section.sideGutterRight ?? 190), ...nodes.map(node => node.x + 100), ...routePoints.map(point => point.x + 65));
  const header=sectionHeaderPositions(song,sectionId);
  const top = Math.min(header.titleY - 65, header.fretY - 65, ...nodes.map(node => node.y + (node.badgeOffset || -68) - 50), ...routePoints.map(point => point.y - 65));
  const bottom = Math.max(header.fretY + 90, section.bottom + 170, ...nodes.map(node => node.y + 180), ...routePoints.map(point => point.y + 65));
  return `${left} ${top} ${right-left} ${bottom-top}`;
}
import { routeVertices } from './reciprocalRoutes.js';

