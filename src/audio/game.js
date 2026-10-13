import { pianoChordKeys } from '../data/pianoPresentation.js';
import { shellVoicing, guitarTuning } from '../shellVoicing.js';

export const grades = ['Nope', 'Okay', 'Good', 'Great', 'Perfect'];
export function normalizeJudgment(result) {
  if (result.missed || (result.chord === 'Nope' && result.timing === 'Nope')) {
    return { ...result, missed: true, chord: null, timing: null, playedPitches: [], offset: undefined };
  }
  return result;
}
export function shellTargets(timeline, nodes) {
  return timeline.events.flatMap((event, index) => {
    const node = nodes.find(node => node.id === event.nodeId);
    if (node?.instrument === 'piano' && event.chord !== 'NC') return [{ ...event, index, pitches: pianoChordKeys(event.chord).pitches }];
    const shell = shellVoicing(event.chord, node);
    return shell ? [{ ...event, index, pitches: [...new Set(shell.notes.map(note => (guitarTuning[note.string] + note.fret) % 12))] }] : [];
  });
}

export function nextShellTarget(targets, activeIndex, hasStarted = true) {
  if (!hasStarted) return targets[0];
  return targets.find(target => target.index > activeIndex) || targets[0];
}

export function timingGrade(seconds) {
  const error = Math.abs(seconds);
  return error <= .15 ? 'Perfect' : error <= .2 ? 'Great' : error <= .3 ? 'Good' : error <= .45 ? 'Okay' : 'Nope';
}

// Sets deliberately discard octaves and note order: inversions score identically.
export function chordGrade(played, expected) {
  const notes = new Set(played.map(pitch => (pitch % 12 + 12) % 12));
  const target = new Set(expected);
  const matches = [...target].filter(pitch => notes.has(pitch)).length;
  if (!matches) return 'Nope';
  const score = 2 * matches / (notes.size + target.size);
  return score >= .99 ? 'Perfect' : score >= .85 ? 'Great' : score >= .7 ? 'Good' : score >= .45 ? 'Okay' : 'Nope';
}

// Pick spectral peaks, suppress likely overtones, then fold into pitch classes.
// This is a lightweight clean-input detector, not a trained transcription model.
export function spectralPitches(spectrum, sampleRate, fftSize) {
  const binHz = sampleRate / fftSize;
  const peaks = [];
  for (let i = Math.ceil(75 / binHz); i < Math.min(spectrum.length - 1, 1500 / binHz); i++) {
    const db = spectrum[i];
    if (db < -70 || db <= spectrum[i - 1] || db < spectrum[i + 1]) continue;
    const a = spectrum[i - 1], b = spectrum[i + 1];
    const correction = Number.isFinite(a + b) ? .5 * (a - b) / (a - 2 * db + b) : 0;
    const frequency = (i + Math.max(-.5, Math.min(.5, correction || 0))) * binHz;
    const midi = 69 + 12 * Math.log2(frequency / 440);
    if (Math.abs(midi - Math.round(midi)) > .4) continue;
    peaks.push({ frequency, pitch: (Math.round(midi) % 12 + 12) % 12, energy: 10 ** (db / 20) });
  }
  const chroma = Array(12).fill(0);
  for (const peak of peaks) {
    const overtone = peaks.some(lower => {
      const harmonic = Math.round(peak.frequency / lower.frequency);
      return harmonic >= 2 && harmonic <= 6 && lower.energy >= peak.energy * .35 &&
        Math.abs(12 * Math.log2(peak.frequency / (lower.frequency * harmonic))) < .35;
    });
    chroma[peak.pitch] += peak.energy * (overtone ? .12 : 1);
  }
  const max = Math.max(...chroma);
  return max > 0 ? chroma.flatMap((energy, pitch) => energy >= max * .22 ? [pitch] : []) : [];
}

export class ShellGameRound {
  constructor(targets, start = 0) {
    this.targets = targets.filter(target => target.start >= start - .05);
    this.claimed = new Set();
  }
  attack(position) {
    const target = this.targets.reduce((best, candidate) =>
      Math.abs(candidate.start - position) < Math.abs((best?.start ?? Infinity) - position) ? candidate : best, null);
    if (!target || this.claimed.has(target.index) || Math.abs(target.start - position) > .5) return null;
    this.claimed.add(target.index);
    return { target, timing: timingGrade(position - target.start), offset: position - target.start };
  }
  misses(position) {
    return this.targets.filter(target => {
      if (this.claimed.has(target.index) || position <= target.start + .5) return false;
      this.claimed.add(target.index);
      return true;
    });
  }
  releaseAttack(index) {
    // An input transient without detected notes is not a played chord.
    this.claimed.delete(index);
  }
}
