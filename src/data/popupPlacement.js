// Always test the preferred right-hand footprint so moving left cannot oscillate.
export function popupShouldMoveLeft(popup, viewportWidth, obstacles, alreadyLeft = false) {
  const right = viewportWidth - 16;
  const left = right - popup.width;
  const margin = alreadyLeft ? 24 : 12;
  return obstacles.some(rect => rect.width > 0 && rect.height > 0 &&
    rect.left < right + margin && rect.right > left - margin &&
    rect.top < popup.bottom + margin && rect.bottom > popup.top - margin);
}

export function popupPlacement(popup, viewportWidth, viewportHeight, obstacles, previous) {
  const margin = 24; // Include the indicator's thick stroke and a visible gap.
  const positions = [];
  const tops = [16, ...obstacles.flatMap(rect => [rect.bottom + margin, rect.top - popup.height - margin])];
  const overlap = (left, top) => obstacles.reduce((area, rect) => {
    if (rect.width <= 0 || rect.height <= 0) return area;
    const width = Math.max(0, Math.min(left + popup.width, rect.right + margin) - Math.max(left, rect.left - margin));
    const height = Math.max(0, Math.min(top + popup.height, rect.bottom + margin) - Math.max(top, rect.top - margin));
    return area + width * height;
  }, 0);
  for (const top of tops) {
    if (top < 16 || top + popup.height > viewportHeight - 16) continue;
    for (const side of ['right', 'left']) {
      const left = side === 'left' ? 16 : viewportWidth - 16 - popup.width;
      positions.push({ side, top, overlap: overlap(left, top) });
    }
  }
  // Retain a clear position while the indicator moves to prevent jitter.
  if (previous && previous.top + popup.height <= viewportHeight - 16 &&
      overlap(previous.side === 'left' ? 16 : viewportWidth - 16 - popup.width, previous.top) === 0) return previous;
  positions.sort((a, b) => a.overlap - b.overlap);
  const best = positions[0];
  return best ? { side: best.side, top: best.top } : { side: 'right', top: 16 };
}
