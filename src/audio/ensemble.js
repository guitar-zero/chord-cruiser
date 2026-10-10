import { chordNotes, bassNote } from './songs.js';
import { makeBrushBuffers, scheduleBrushes } from './brushes.js';

const soundCache = new Map();
const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

export class JazzPlayer {
  constructor({ drums = true, bass = true } = {}) {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) throw Error('Audio synthesis is unavailable in this browser.');
    this.context = new Context();
    const cacheKey = this.context.sampleRate;
    if (!soundCache.has(cacheKey)) soundCache.set(cacheKey, new Map());
    this.buffers = soundCache.get(cacheKey);
    this.sources = new Set();
    this.drumsEnabled = drums;
    this.bassEnabled = bass;
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
    for (const event of timeline.events) {
      if (event.chord === 'NC') continue;
      for (const note of chordNotes(event.chord)) {
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
    this.seek(offset);
  }
  track(source) {
    this.sources.add(source);
    const ended = source.onended;
    source.onended = () => { this.sources.delete(source); ended?.(); };
  }
  seek(offset) {
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
    this.offset = Math.max(0, Math.min(offset, this.timeline.duration));
    this.startedAt = this.context.currentTime + .03 - this.offset;
    const timeline = this.timeline;
    if (this.brushes) scheduleBrushes(this.context, this.drumBus, this.brushes, timeline, this.startedAt, this.offset, source => this.track(source));
    const beatSeconds = timeline.duration / timeline.beats;
    for (const event of timeline.events) {
      if (event.chord === 'NC') continue;
      const notes = chordNotes(event.chord);
      // A quiet piano chord each bar maintains audibility through ×2/×4 holds.
      for (let beat = 0; beat < event.beats; beat += (timeline.beatsPerBar || 4)) {
        const originalStart = event.start + beat * beatSeconds;
        const originalLength = Math.min(timeline.beatsPerBar || 4, event.beats - beat) * beatSeconds;
        if (originalStart + originalLength <= this.offset) continue;
        const start = Math.max(originalStart, this.offset);
        const length = originalStart + originalLength - start;
        if (this.bassEnabled) {
          const at = this.startedAt + start;
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
          const at = this.startedAt + start + index * .002;
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
    if (wrapped) this.seek(position);
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
