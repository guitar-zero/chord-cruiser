import React, { useId } from 'react';

export const routePalette = ['#cc480e', '#267b99', '#8b4695', '#29805d', '#a06a16', '#be3d6a', '#485aa3', '#576b24'];

// The triangle extends 15 units past the shaft. Reserve another six for a
// visible gap before the original node attachment point.
export function insetArrowShaft(d, inset = 21) {
  const tokens = d.match(/[MLHV]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) || [];
  const vertices = [];
  let x = 0, y = 0, command, i = 0;
  while (i < tokens.length) {
    if (/^[MLHV]$/i.test(tokens[i])) command = tokens[i++].toUpperCase();
    if (command === 'M' || command === 'L') { x = Number(tokens[i++]); y = Number(tokens[i++]); }
    else if (command === 'H') x = Number(tokens[i++]);
    else if (command === 'V') y = Number(tokens[i++]);
    else throw new Error('Unsupported arrow path.');
    vertices.push([x, y]);
    if (command === 'M') command = 'L';
  }
  while (vertices.length > 1 && inset > 0) {
    const end = vertices.at(-1), start = vertices.at(-2);
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (length <= inset && vertices.length > 2) { vertices.pop(); inset -= length; continue; }
    const trim = Math.min(inset, Math.max(0, length - 1));
    vertices[vertices.length - 1] = [end[0] - (end[0] - start[0]) * trim / length, end[1] - (end[1] - start[1]) * trim / length];
    break;
  }
  return vertices.map(([a, b], j) => `${j ? 'L' : 'M'}${a} ${b}`).join(' ');
}

// Sample our straight SVG segments to detect crossings and nearby parallel routes.
export function sampleRoute(d) {
  const tokens = d.match(/[MLHV]|-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi) || [];
  let x = 0, y = 0, command, i = 0;
  const points = [];
  while (i < tokens.length) {
    if (/^[MLHV]$/i.test(tokens[i])) command = tokens[i++].toUpperCase();
    let nextX = x, nextY = y;
    if (command === 'M' || command === 'L') { nextX = Number(tokens[i++]); nextY = Number(tokens[i++]); }
    else if (command === 'H') nextX = Number(tokens[i++]);
    else if (command === 'V') nextY = Number(tokens[i++]);
    else throw new Error('Route coloring supports straight M/L/H/V paths.');
    if (command !== 'M') {
      const steps = Math.max(1, Math.ceil(Math.hypot(nextX - x, nextY - y) / 6));
      for (let step = 0; step <= steps; step++) points.push([x + (nextX - x) * step / steps, y + (nextY - y) * step / steps]);
    } else { points.push([nextX, nextY]); command = 'L'; }
    x = nextX; y = nextY;
  }
  return points;
}

export function routesConflict(a, b, clearance = 18) {
  const first = sampleRoute(a), second = sampleRoute(b);
  for (let i = 1; i < first.length; i++) {
    const [ax, ay] = first[i - 1], [bx, by] = first[i];
    const dx = bx - ax, dy = by - ay, lengthA = Math.hypot(dx, dy);
    if (!lengthA) continue;
    for (let j = 1; j < second.length; j++) {
      const [cx, cy] = second[j - 1], [ex, ey] = second[j];
      const ux = ex - cx, uy = ey - cy, lengthB = Math.hypot(ux, uy);
      if (!lengthB) continue;
      const cross = dx * uy - dy * ux;
      if (Math.abs(cross) > 0.00001) {
        const t = ((cx - ax) * uy - (cy - ay) * ux) / cross;
        const u = ((cx - ax) * dy - (cy - ay) * dx) / cross;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
      }
      // Nearby turns and converging arrows remain the same color unless
      // their directions are within about twenty degrees of parallel.
      const parallel = Math.abs(dx * ux + dy * uy) / (lengthA * lengthB) > 0.94;
      if (parallel && (bx - ex) ** 2 + (by - ey) ** 2 < clearance ** 2) return true;
    }
  }
  return false;
}

export function colorRoutes(routes, clearance = 18) {
  const conflicts = routes.map((route, i) => routes.map((other, j) => i !== j && routesConflict(route.d, other.d, clearance)));
  const colors = [];
  // Color busiest routes first, keeping preferred colors whenever possible.
  const order = routes.map((_, i) => i).sort((a, b) => conflicts[b].filter(Boolean).length - conflicts[a].filter(Boolean).length);
  for (const i of order) {
    const used = new Set(colors.filter((_, j) => conflicts[i][j]));
    const palette = routes[i].palette || routePalette;
    const choices = [routes[i].preferred, ...palette].filter(color => color && palette.includes(color));
    colors[i] = choices.find(color => !used.has(color));
    if (!colors[i]) throw new Error('Route palette needs more distinct colors for this graph.');
  }
  return colors;
}

export default function RouteColors({ children, distinguishPasses = false, palette, preferredColor = '#cc480e', secondPassColor = '#8b4695', ...props }) {
  const id = useId();
  const paths = [];
  function collect(items) {
    React.Children.forEach(items, child => {
      if (!React.isValidElement(child)) return;
      if (child.type === 'path' && child.props.stroke !== '#fbf8ed') paths.push(child);
      else if (child.props.children) collect(child.props.children);
    });
  }
  collect(children);
  const inheritedWidth = Number(props.strokeWidth) || 6;
  const colors = colorRoutes(paths.map(path => ({
    d: path.props.d,
    preferred: path.props.stroke || (distinguishPasses && path.props.strokeDasharray ? secondPassColor : preferredColor),
    palette,
  })));
  let index = 0;
  function paint(items, parentWidth = inheritedWidth) {
    return React.Children.map(items, child => {
      if (!React.isValidElement(child)) return child;
      if (child.type === 'path' && child.props.stroke !== '#fbf8ed') {
        const color = colors[index++];
        const width = Math.min(Number(child.props.strokeWidth) || parentWidth, 6);
        return React.cloneElement(child, { 'data-arrow-tip': true, d: insetArrowShaft(child.props.d), stroke: color, strokeWidth: width, strokeLinecap: 'butt', markerStart: 'none', markerMid: 'none', markerEnd: `url(#${id}-${routePalette.indexOf(color)})` });
      }
      return child.props.children ? React.cloneElement(child, {}, paint(child.props.children, Number(child.props.strokeWidth) || parentWidth)) : child;
    });
  }
  return <g {...props}>
    <defs>{routePalette.map((color, i) => <marker key={color} id={`${id}-${i}`} viewBox="0 0 12 12" refX="1" refY="6" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="18" orient="auto" overflow="visible"><path d="M1 1 L11 6 L1 11 Z" fill={color} stroke="none" strokeWidth="0" markerStart="none" markerMid="none" markerEnd="none" /></marker>)}</defs>
    {paint(children)}
  </g>;
}
