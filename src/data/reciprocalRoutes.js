import { rainbowChoices } from './routePalette.js';

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

// Parallel segments sharing a corridor need distinct lanes, even on unrelated edges.
export function parallelOverlap(first, second, clearance = 20) {
  const a=routeVertices(first), b=routeVertices(second);
  for(let i=1;i<a.length;i++) for(let j=1;j<b.length;j++) {
    const p=a[i-1], q=a[i], r=b[j-1], t=b[j];
    const dx=q.x-p.x,dy=q.y-p.y,length=Math.hypot(dx,dy);
    const ux=t.x-r.x,uy=t.y-r.y,otherLength=Math.hypot(ux,uy);
    if(!length || !otherLength || Math.abs(dx*uy-dy*ux)/(length*otherLength)>.001) continue;
    if(Math.abs((r.x-p.x)*dy-(r.y-p.y)*dx)/length>=clearance) continue;
    const project=point=>((point.x-p.x)*dx+(point.y-p.y)*dy)/length;
    const start=project(r),end=project(t);
    if(Math.min(length,Math.max(start,end))-Math.max(0,Math.min(start,end))>20) return true;
  }
  return false;
}

export function reciprocalRoutes(song, section, palette, paths, branchColors) {
  const edges = song.edges.filter(edge => edge.section === section.id);
  const firstVisit = edge => {
    if (Number.isInteger(edge.firstVisit)) return edge.firstVisit;
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
    const corridor = paths[first.id] || first.path || (later.path ? serialize(routeVertices(later.path).reverse()) : null);
    if (!corridor) continue;
    const firstColor = branchColors[first.id] || section.color || '#c43b32';
    const siblingColors = edges.filter(other => other.source === later.source && other.id !== later.id).map(other => branchColors[other.id]).filter(Boolean);
    const laterColor = rainbowChoices(branchColors[later.id] || firstColor, palette).find(color => color && color !== firstColor && !siblingColors.includes(color));
    if (!laterColor) throw Error('Reciprocal routes need another distinct color.');
    result[first.id] = { path: offsetRoute(corridor,14), color: firstColor };
    result[later.id] = { path: offsetRoute(corridor,-14,true), color: laterColor };
    handled.add(first.id); handled.add(later.id);
  }
  // Retain reciprocal corridors, then separate any remaining shared segments.
  const accepted=[];
  for(const edge of [...edges].sort((a,b)=>firstVisit(a)-firstVisit(b))) {
    const base=result[edge.id]?.path || paths[edge.id];
    if(!base) continue;
    const nearby=accepted.filter(other=>parallelOverlap(base,other.path,40));
    for(const other of nearby) result[other.id]={path:other.path,color:other.color};
    let path=base;
    if(accepted.some(other=>parallelOverlap(path,other.path))) {
      const offsets=Array.from({length:40},(_,i)=>(Math.floor(i/2)+1)*28*(i%2 ? -1 : 1));
      const candidate=offsets.map(offset=>offsetRoute(base,offset)).find(candidate=>!accepted.some(other=>parallelOverlap(candidate,other.path)));
      if(!candidate) throw Error(`No separate route lane for ${edge.id}`);
      path=candidate;
    }
    let color=result[edge.id]?.color || branchColors[edge.id] || edge.preferredColor || (edge.passNumber===2 ? '#8b4695' : section.color || '#c43b32');
    if(nearby.some(other=>other.color===color)) color=rainbowChoices(color,palette).find(candidate=>!nearby.some(other=>other.color===candidate));
    if(!color) throw Error('Parallel routes need another distinct color.');
    // Leave non-overlapping routes available to the crossing-color allocator.
    if(path!==base || nearby.length || result[edge.id]) result[edge.id]={path,color};
    accepted.push({id:edge.id,path,color});
  }
  return result;
}
