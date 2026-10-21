export function curvePoint(curve, t) {
  const u = 1 - t;
  const coordinate = axis => u ** 3 * curve.from[axis] + 3 * u * u * t * curve.first[axis]
    + 3 * u * t * t * curve.second[axis] + t ** 3 * curve.to[axis];
  return { x: coordinate('x'), y: coordinate('y') };
}

export function sampleCurve(curve) {
  const samples = [{ ...curve.from, distance: 0 }];
  for (let step = 1; step <= 80; step++) {
    const point = curvePoint(curve, step / 80), previous = samples.at(-1);
    samples.push({ ...point, distance: previous.distance + Math.hypot(point.x - previous.x, point.y - previous.y) });
  }
  return samples;
}

export function pointAtDistance(samples, distance) {
  let low = 1, high = samples.length - 1;
  const target = Math.max(0, Math.min(distance, samples.at(-1).distance));
  while (low < high) {
    const middle = (low + high) >> 1;
    if (samples[middle].distance < target) low = middle + 1;
    else high = middle;
  }
  const a = samples[low - 1], b = samples[low];
  const fraction = (target - a.distance) / (b.distance - a.distance || 1);
  return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction, dx: b.x - a.x, dy: b.y - a.y };
}

export function wakeOpacity(age) {
  const t = Math.max(0, Math.min(1, (age - 9600) / 400));
  return 1 - t * t * (3 - 2 * t);
}

export function restingSpot(point, occupied, ship) {
  const clear = candidate =>
    ((candidate.x - ship.x) / (ship.rx + 22)) ** 2 + ((candidate.y - ship.y) / (ship.ry + 22)) ** 2 >= 1
    && occupied.every(other => ((candidate.x - other.x) / 62) ** 2 + ((candidate.y - other.y) / 52) ** 2 >= 1);
  if (clear(point)) return point;
  let best = null, nearest = Infinity;
  for (let x = 24; x <= 456; x += 12) {
    for (let y = 24; y <= 296; y += 12) {
      const candidate = { x, y };
      const distance = (x - point.x) ** 2 + (y - point.y) ** 2;
      if (distance < nearest && clear(candidate)) { best = candidate; nearest = distance; }
    }
  }
  return best || point;
}


// Reserve the whole curve so boats cannot enter one another's travel corridor.
export function routesOverlap(first, second) {
  const sparse = route => route.filter((_, index) => index % 4 === 0 || index === route.length - 1);
  const firstPoints = sparse(first), secondPoints = sparse(second);
  return firstPoints.some(a => secondPoints.some(b =>
    ((a.x - b.x) / 78) ** 2 + ((a.y - b.y) / 66) ** 2 < 1));
}
