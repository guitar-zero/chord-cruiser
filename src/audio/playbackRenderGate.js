// Keep the audio/animation clock at display rate while limiting expensive UI
// renders. Chord boundaries, seeks, and loops always publish immediately.
export class PlaybackRenderGate {
  lastTime = -Infinity;
  lastVisit = null;
  shouldRender(time, visit, force = false) {
    if (!force && visit === this.lastVisit && time - this.lastTime < 1000 / 30) return false;
    this.lastTime = time;
    this.lastVisit = visit;
    return true;
  }
}
