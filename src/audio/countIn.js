export function countInSchedule(beatSeconds) {
  const readyBeats = Math.ceil(2 / beatSeconds);
  const hereWeGoBeats = Math.ceil(1 / beatSeconds);
  return { introBeats: readyBeats + hereWeGoBeats, totalBeats: readyBeats + hereWeGoBeats + 8, hereWeGoBeats };
}

export function countInBeat(seconds, beatSeconds) {
  return Math.max(0, Math.min(countInSchedule(beatSeconds).totalBeats, Math.ceil(seconds / beatSeconds)));
}

export function shouldLaunchCountInIndicator(remaining, beatSeconds) {
  return Number.isFinite(remaining) && remaining <= 8 * beatSeconds;
}

export function countInLabel(beat, beatSeconds = .5) {
  return beat > 8 + countInSchedule(beatSeconds).hereWeGoBeats ? 'Get ready' : beat > 8 ? 'Here we go' : beat > 0 ? String(beat) : null;
}

export function countInChords(targets, position, duration) {
  if (!targets.length) return [];
  const start = position >= duration ? 0 : position;
  let index = targets.findIndex(event => start >= event.start && start < event.start + event.duration);
  if (index < 0) index = targets.findIndex(event => event.start >= start);
  if (index < 0) index = 0;
  return [targets[index], targets[(index + 1) % targets.length]];
}
