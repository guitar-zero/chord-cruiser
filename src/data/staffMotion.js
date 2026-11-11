export const STAFF_PLAY_SLOT = 2;
export const STAFF_LEADING_EVENTS = 1;

// Start the sounding chord in the play box, then keep it visible for its hold.
// A leading event leaves room for the previous chord to fade by the clef.
// At the boundary, the arriving chord keeps exactly the same screen position.
export function staffScrollPercent(clock, fallbackIndex, visibleCount, reducedMotion = false) {
  const index = Math.max(0, clock?.visitIndex ?? fallbackIndex);
  const progress = reducedMotion ? 0 : Math.max(0, Math.min(1, clock?.progress || 0));
  return (STAFF_PLAY_SLOT - STAFF_LEADING_EVENTS - .5 - index - progress) * 100 / visibleCount;
}
