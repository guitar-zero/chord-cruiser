export function isPlaybackAdvance(previous, next, eventCount) {
  if (!previous || !next) return false;
  const sequential = next.visitIndex === previous.visitIndex + 1 && next.seekVersion === previous.seekVersion;
  const loop = previous.visitIndex === eventCount - 1 && next.visitIndex === 0 && next.loopIteration === previous.loopIteration + 1 && next.seekVersion === previous.seekVersion + 1;
  return sequential || loop;
}

export function retainTransitionPipe(bridge, current, arrival, eventCount, inFlight = false) {
  if (!isPlaybackAdvance(bridge, current, eventCount)) return false;
  const landed = arrival?.node === current.node && arrival?.visitIndex === current.visitIndex && arrival?.seekVersion === current.seekVersion;
  return inFlight || !landed;
}
