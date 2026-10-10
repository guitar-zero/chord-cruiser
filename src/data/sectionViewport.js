// Crop an existing measured section rather than changing its node/path geometry.
export function sectionViewport(song, sectionId) {
  const section = song.layout.sections.find(item => item.id === sectionId);
  if (!section) return song.layout.viewBox;
  const nodes = song.nodes.filter(node => node.section === sectionId);
  const routePoints = song.edges.filter(edge => edge.section === sectionId && edge.path).flatMap(edge => routeVertices(edge.path));
  const left = Math.min(section.left - 190, ...nodes.map(node => node.x - 100), ...routePoints.map(point => point.x - 65));
  const right = Math.max(section.right + 190, ...nodes.map(node => node.x + 100), ...routePoints.map(point => point.x + 65));
  const top = Math.min((section.titleY || 286) - 65, section.fretY - 65, ...nodes.map(node => node.y + (node.badgeOffset || -68) - 50), ...routePoints.map(point => point.y - 65));
  const bottom = Math.max(section.bottom + 170, ...nodes.map(node => node.y + 180), ...routePoints.map(point => point.y + 65));
  return `${left} ${top} ${right-left} ${bottom-top}`;
}
import { routeVertices } from './reciprocalRoutes.js';

