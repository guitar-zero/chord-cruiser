export function chordProgress(event, position) {
  if (!event || event.duration <= 0) return 0;
  return Math.max(0, Math.min(1, (position - event.start) / event.duration));
}

export function beatCountdown(clock) {
  const beatsLeft = Math.ceil(Math.max(0, (clock?.beats || 0) * (1 - (clock?.progress || 0))) - 1e-8);
  const elapsedBeats = (clock?.position || 0) * (clock?.bpm || 120) / 60;
  return { beatsLeft: Math.max(0, beatsLeft), phase: elapsedBeats - Math.floor(elapsedBeats) };
}

export function pipeProgress(visitIndex, clock, seekVersion) {
  if (!clock) return 0;
  // A traveled pipe stays full during the indicator's move and on loop wraps.
  if (clock.visitIndex !== visitIndex || clock.seekVersion !== seekVersion) return 1;
  return Math.max(0, Math.min(1, clock.progress));
}
