export function gameBarState(timeline, segments, position) {
  const found = segments.findIndex(segment => position >= segment.start && position < segment.end);
  const index = found >= 0 ? found : position >= timeline.duration ? Math.max(0, segments.length - 1) : 0;
  const bars = Math.ceil(timeline.beats / timeline.beatsPerBar);
  return { index, bar: Math.min(bars, Math.floor(position / timeline.duration * timeline.beats / timeline.beatsPerBar) + 1), bars, percent: Math.max(0, Math.min(100, position / timeline.duration * 100)) };
}
