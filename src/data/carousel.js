export function visibleSectionIndices(start, count) {
  return [start, (start + 1) % count];
}

export function followSection(start, active, count, reset = false) {
  if (active < 0) return start;
  return reset || !visibleSectionIndices(start,count).includes(active) ? active : start;
}
