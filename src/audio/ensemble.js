import { bassNote } from './songs.js';
import { pianoHits } from './pianoVoicings.js';
import { makeBrushBuffers, scheduleBrushes } from './brushes.js';
import { scheduleRacingCountIn } from './racingCountIn.js';
import { countInSchedule } from './countIn.js';

const soundCache = new Map();
const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

export class JazzPlayer {
  constructor({ drums = true, bass = true, countIn = 0, countInIntroBeats = 0, racingCountIn = false, beatSeconds = .5, pianoOnNodes = false } = {}) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw Error('Audio synthesis is unavailable in this browser.');
    this.context = new Context();
    const cacheKey = this.context.sampleRate;
    if (!soundCache.has(cacheKey)) soundCache.set(cacheKey, new Map());
    this.buffers = soundCache.get(cacheKey);
    this.sources = new Set();
    this.drumsEnabled = drums;
    this.bassEnabled = bass;
    this.countIn = countIn;
    this.countInIntroBeats = countInIntroBeats;
    this.racingCountIn = racingCountIn;
    this.beatSeconds = beatSeconds;
    this.pianoOnNodes = pianoOnNodes;
    this.bassBus = this.context.createGain();
    this.bassBus.gain.value = .38;
    this.drumBus = this.context.createGain();
    this.drumBus.gain.value = .24;
    this.master = this.context.createGain();
    this.master.gain.value = .3;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 2400; filter.Q.value = .5;
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = -18; compressor.ratio.value = 3;
    this.master.connect(filter); filter.connect(compressor); this.drumBus.connect(compressor); this.bassBus.connect(compressor); compressor.connect(this.context.destination);
  }
  buffer(midi) {
    if (this.buffers.has(midi)) return this.buffers.get(midi);
    const ctx = this.context, seconds = 4;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    // Soft piano hammer and paired, slightly detuned strings. Higher partials
    // fade quickly while the fundamental provides a quiet rounded sustain.
    for (let i = 0; i < samples.length; i++) {
      const t = i / ctx.sampleRate;
      let value = 0;
      for (let harmonic = 1; harmonic <= 8; harmonic++) {
        const partial = frequency * harmonic * Math.sqrt(1 + .000035 * harmonic ** 2);
        const phase = 2 * Math.PI * partial * t;
        const strings = .65 * Math.sin(phase) + .35 * Math.sin(phase * 1.0008);
        const decay = Math.exp(-t * (.72 + harmonic * .34));
        value += strings * decay / harmonic ** 1.55;
      }
      const hammer = 1 - Math.exp(-t * 420);
      samples[i] = value * hammer * .27;
    }
    this.buffers.set(midi, buffer);
    return buffer;
  }
  async start(timeline, offset = 0, beforePlayback) {
    if (this.stopped) return;
    await this.context.resume();
    // Allow React to paint the spinner, then prepare notes in short chunks.
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (this.stopped) return;
    this.timeline = timeline;
    this.pianoHits = pianoHits(timeline, { nodesOnly: this.pianoOnNodes });
    for (const event of this.pianoHits) {
      for (const note of event.notes) {
        if (this.stopped || this.context.state === 'closed') return;
        if (!this.buffers.has(note)) { this.buffer(note); await yieldToUI(); }
      }
      if (this.bassEnabled && !this.buffers.has(`bass-${bassNote(event.chord)}`)) { this.bassBuffer(bassNote(event.chord)); await yieldToUI(); }
    }
    if (this.stopped || this.context.state === 'closed') return;
    if (this.drumsEnabled) {
      if (!this.buffers.has('brushes')) this.buffers.set('brushes', makeBrushBuffers(this.context));
      this.brushes = this.buffers.get('brushes');
    }
    await beforePlayback?.();
    if (this.stopped || this.context.state === 'closed') return;
    this.seek(offset, this.countIn);
  }
  track(source) {
    this.sources.add(source);
    const ended = source.onended;
    source.onended = () => { this.sources.delete(source); ended?.(); };
  }
  seek(offset, countIn = 0) {
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
    this.offset = Math.max(0, Math.min(offset, this.timeline.duration));
    this.startedAt = this.context.currentTime + .03 + countIn - this.offset;
    this.countInEndsAt = countIn > 0 ? this.startedAt + this.offset : null;
    if (countIn > 0 && this.racingCountIn) {
      const start = this.context.currentTime + .03;
      const schedule = countInSchedule(this.beatSeconds);
      const hereWeGo = start + (schedule.introBeats - schedule.hereWeGoBeats) * this.beatSeconds;
      scheduleRacingCountIn(this.context, this.countInEndsAt, this.beatSeconds, source => this.track(source), { start, hereWeGo });
    }
    for (let beat = this.countInIntroBeats || 0; !this.racingCountIn && beat * this.beatSeconds < countIn; beat++) {
      const at = this.context.currentTime + .03 + beat * this.beatSeconds;
      const click = this.context.createOscillator(), gain = this.context.createGain();
      click.frequency.value = beat === (this.countInIntroBeats || 0) ? 1100 : 800;
      gain.gain.setValueAtTime(.18, at); gain.gain.exponentialRampToValueAtTime(.001, at + .08);
      click.connect(gain); gain.connect(this.drumBus);
      click.onended = () => { click.disconnect(); gain.disconnect(); };
      this.track(click); click.start(at); click.stop(at + .09);
    }
    const timeline = this.timeline;
    if (this.brushes && countIn > 0 && this.racingCountIn) {
      const leadIn = { beats: 8, beatsPerBar: 4, duration: 8 * this.beatSeconds };
      scheduleBrushes(this.context, this.drumBus, this.brushes, leadIn,
        this.countInEndsAt - leadIn.duration, 0, source => this.track(source));
    }
    this.scheduleCycle(this.startedAt, this.offset);
    this.scheduleCycle(this.startedAt + timeline.duration, 0);
    this.scheduledThrough = this.startedAt + timeline.duration * 2;
  }
  scheduleCycle(startedAt, offset = 0) {
    const timeline = this.timeline;
    if (this.brushes) scheduleBrushes(this.context, this.drumBus, this.brushes, timeline, startedAt, offset, source => this.track(source));
    for (const event of this.pianoHits) {
        const notes = event.notes;
        const originalStart = event.start;
        const originalLength = event.duration;
        if (originalStart + originalLength <= offset) continue;
        const start = Math.max(originalStart, offset);
        const length = originalStart + originalLength - start;
        if (this.bassEnabled) {
          const at = startedAt + start;
          const source = this.context.createBufferSource(); source.buffer = this.bassBuffer(bassNote(event.chord));
          const gain = this.context.createGain();
          const end = at + Math.min(3.9, length * .94);
          gain.gain.setValueAtTime(.8, at);
          gain.gain.setValueAtTime(.8, Math.max(at, end - .05));
          gain.gain.linearRampToValueAtTime(0, end);
          source.connect(gain); gain.connect(this.bassBus);
          source.onended = () => { source.disconnect(); gain.disconnect(); };
          this.track(source); source.start(at); source.stop(end + .01);
        }
        notes.forEach((note, index) => {
          const at = startedAt + start + index * .002;
          const source = this.context.createBufferSource(); source.buffer = this.buffer(note);
          const gain = this.context.createGain();
          const end = at + Math.min(3.9, length * .94);
          gain.gain.setValueAtTime(.55, at);
          gain.gain.setValueAtTime(.55, Math.max(at, end - .05));
          gain.gain.linearRampToValueAtTime(0, end);
          source.connect(gain); gain.connect(this.master);
          source.onended = () => { source.disconnect(); gain.disconnect(); };
          this.track(source); source.start(at); source.stop(end + .01);
        });
    }
  }
  bassBuffer(midi) {
    const key = `bass-${midi}`;
    if (this.buffers.has(key)) return this.buffers.get(key);
    const buffer = this.context.createBuffer(1, this.context.sampleRate * 4, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    for (let i = 0; i < samples.length; i++) {
      const t = i / this.context.sampleRate;
      const phase = 2 * Math.PI * frequency * t;
      samples[i] = (Math.sin(phase) + .22 * Math.sin(phase * 2) + .08 * Math.sin(phase * 3)) * .38 * (1 - Math.exp(-t * 350)) * Math.exp(-t * 1.7);
    }
    this.buffers.set(key, buffer);
    return buffer;
  }
  get elapsed() { return Math.max(this.offset || 0, this.context.currentTime - this.startedAt); }
  loopPosition() {
    const elapsed = this.elapsed;
    const wrapped = elapsed >= this.timeline.duration;
    const position = wrapped ? elapsed % this.timeline.duration : elapsed;
    if (wrapped) {
      this.startedAt += Math.floor(elapsed / this.timeline.duration) * this.timeline.duration;
      this.offset = 0;
      this.countInEndsAt = null;
      // The next pass is already queued on the audio clock; never seek here.
      if (this.scheduledThrough <= this.startedAt) this.scheduleCycle(this.startedAt, position);
      const nextStart = this.startedAt + this.timeline.duration;
      if (this.scheduledThrough <= nextStart) {
        this.scheduleCycle(nextStart, 0);
        this.scheduledThrough = nextStart + this.timeline.duration;
      }
    }
    return { position, wrapped };
  }
  pause() { return this.context.suspend(); }
  resume() { return this.context.resume(); }
  stop() {
    this.stopped = true;
    // Silence immediately, including while close() or sound preparation is pending.
    if (this.context.state === 'closed') return Promise.resolve();
    for (const bus of [this.master, this.drumBus, this.bassBus]) bus.gain.setValueAtTime(0, this.context.currentTime);
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
    return this.context.close();
  }
}
