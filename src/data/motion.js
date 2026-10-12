export function pointAlongRoute(points, progress) {
  return routeSampler(points)(progress);
}

export function routeSampler(points) {
  const lengths = points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return progress => {
    let distance = total * Math.max(0, Math.min(1, progress));
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i] && lengths[i] > 0) {
        const t = distance / lengths[i];
        return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t };
      }
      distance -= lengths[i];
    }
    return points.at(-1);
  };
}
