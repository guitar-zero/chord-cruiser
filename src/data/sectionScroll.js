export function sectionScrollDelta(source, destination, viewportHeight) {
  if (!source) return destination.top;
  const top = Math.min(source.top, destination.top);
  const bottom = Math.max(source.bottom, destination.bottom);
  if (top >= 0 && bottom <= viewportHeight) return 0;
  // Returning upward places the destination first, followed by the current chart.
  if (destination.top < source.top) return destination.top;
  if (bottom - top <= viewportHeight) return top;
  // If both cannot fit, show the next chart and as much of the current one as possible.
  return destination.bottom - destination.top > viewportHeight ? destination.top : destination.bottom - viewportHeight;
}

export function scrollChartSections(source, destination) {
  if (!destination) return;
  const delta = sectionScrollDelta(source?.getBoundingClientRect(), destination.getBoundingClientRect(), window.innerHeight);
  if (Math.abs(delta) < 1) return;
  window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
