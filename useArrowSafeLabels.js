import { useLayoutEffect, useRef } from 'react';

// Arrow tips get priority over labels. Coordinates are in the SVG viewBox.
export default function useArrowSafeLabels() {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const tips = [...svg.querySelectorAll('[data-arrow-tip]')].filter(path => !path.closest('[aria-hidden="true"]')).map(path => {
      const length = path.getTotalLength();
      const end = path.getPointAtLength(length);
      const before = path.getPointAtLength(Math.max(0, length - 1));
      const dx = end.x - before.x, dy = end.y - before.y;
      const size = Math.hypot(dx, dy) || 1;
      // Triangle is 15 units long. Reserve its complete silhouette plus padding.
      return { x: end.x + dx / size * 7.5 - 19, y: end.y + dy / size * 7.5 - 19, width: 38, height: 38 };
    });
    const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    const nodes = [...svg.querySelectorAll('[data-node-shape]')].filter(shape => !shape.closest('[data-chart-label]')).map(shape => shape.getBBox());
    const labels = [...svg.querySelectorAll('[data-chart-label]')];
    labels.forEach(label => label.removeAttribute('transform'));
    const boxes = labels.map(label => label.getBBox());
    // Beat countdowns move upward together to preserve their shared node offset.
    const aboveIndices = labels.flatMap((label, index) => label.hasAttribute('data-chart-label-above') ? [index] : []);
    const aboveSet = new Set(aboveIndices);
    const sharedOffset = Array.from({ length: 11 }, (_, i) => -i * 24).find(dy =>
      aboveIndices.every(index => {
        const box = boxes[index];
        const candidate = { x: box.x, y: box.y + dy, width: box.width, height: box.height };
        return !tips.some(tip => overlaps(candidate, tip)) && !nodes.some(node => overlaps(candidate, node)) && !boxes.some((other, i) => !aboveSet.has(i) && overlaps(candidate, other));
      })
    ) ?? 0;
    aboveIndices.forEach(index => {
      if (sharedOffset) labels[index].setAttribute('transform', `translate(0 ${sharedOffset})`);
      boxes[index] = { ...boxes[index], y: boxes[index].y + sharedOffset };
    });
    labels.forEach((label, index) => {
      if (aboveSet.has(index)) return;
      const box = boxes[index];
      const offsets = [[0, 0]];
      for (let distance = 24; distance <= 240; distance += 24) {
        offsets.push([0, distance], [0, -distance], [distance, 0], [-distance, 0]);
      }
      const free = offsets.find(([dx, dy]) => {
        const candidate = { x: box.x + dx, y: box.y + dy, width: box.width, height: box.height };
        return !tips.some(tip => overlaps(candidate, tip)) && !nodes.some(node => overlaps(candidate, node)) && !boxes.some((other, i) => i !== index && overlaps(candidate, other));
      });
      if (free && (free[0] || free[1])) {
        label.setAttribute('transform', `translate(${free[0]} ${free[1]})`);
        boxes[index] = { x: box.x + free[0], y: box.y + free[1], width: box.width, height: box.height };
      }
    });
  });
  return ref;
}
