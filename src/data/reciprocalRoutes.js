// Offset a straight-segment route, retaining parallel lanes through its bends.
export function routeVertices(path) {
  const tokens = path.match(/[MLHV]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) || [];
  const points = [];
  let x = 0, y = 0, command, i = 0;
  while (i < tokens.length) {
    if (/^[MLHV]$/i.test(tokens[i])) command = tokens[i++].toUpperCase();
    if (command === 'M' || command === 'L') { x = Number(tokens[i++]); y = Number(tokens[i++]); }
    else if (command === 'H') x = Number(tokens[i++]);
    else if (command === 'V') y = Number(tokens[i++]);
    else throw Error('Expected a straight-segment route.');
    const previous = points.at(-1);
    if (!previous || previous.x !== x || previous.y !== y) points.push({ x, y });
    if (command === 'M') command = 'L';
  }
  return points;
}
const serialize = points => points.map((p,i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
export function offsetRoute(path, distance, reverse = false) {
  const points = routeVertices(path);
  if (points.length < 2) return path;
  const normals = points.slice(1).map((p,i) => {
    const dx = p.x - points[i].x, dy = p.y - points[i].y, length = Math.hypot(dx,dy);
    return { x: -dy / length, y: dx / length };
  });
  const shifted = points.map((point,i) => {
    const before = normals[Math.max(0,i-1)], after = normals[Math.min(i,normals.length-1)];
    const divisor = 1 + before.x * after.x + before.y * after.y;
    const scale = divisor > .1 ? distance / divisor : distance / 2;
    return { x: point.x + (before.x + after.x) * scale, y: point.y + (before.y + after.y) * scale };
  });
  return serialize(reverse ? shifted.reverse() : shifted);
}

export function reciprocalRoutes(song, section, palette, paths, branchColors) {
  const edges = song.edges.filter(edge => edge.section === section.id);
  const firstVisit = edge => {
    const i = song.playback.findIndex((event,index) => event.nodeId === edge.source && song.playback[index+1]?.nodeId === edge.target);
    return i < 0 ? Infinity : i;
  };
  const result = {}, handled = new Set();
  for (const edge of edges) {
    if (handled.has(edge.id) || !edge.target) continue;
    const opposite = edges.find(other => other.source === edge.target && other.target === edge.source);
    if (!opposite) continue;
    const [first,later] = firstVisit(edge) <= firstVisit(opposite) ? [edge,opposite] : [opposite,edge];
    // Share one corridor, including a saved obstacle-avoiding route if present.
    const corridor = first.path || (later.path ? serialize(routeVertices(later.path).reverse()) : paths[first.id]);
    if (!corridor) continue;
    const firstColor = branchColors[first.id] || section.color || '#cc480e';
    const siblingColors = edges.filter(other => other.source === later.source && other.id !== later.id).map(other => branchColors[other.id]).filter(Boolean);
    const laterColor = [branchColors[later.id], ...palette].find(color => color && color !== firstColor && !siblingColors.includes(color));
    if (!laterColor) throw Error('Reciprocal routes need another distinct color.');
    result[first.id] = { path: offsetRoute(corridor,14), color: firstColor };
    result[later.id] = { path: offsetRoute(corridor,-14,true), color: laterColor };
    handled.add(first.id); handled.add(later.id);
  }
  return result;
}
