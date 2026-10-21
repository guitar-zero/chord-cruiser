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
