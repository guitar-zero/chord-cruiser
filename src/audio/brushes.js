// Quiet swung ride, brushed snare sweeps, and a soft hi-hat on two and four.
export function brushPattern(beats) {
  const hits = [];
  for (let beat = 0; beat < beats; beat++) {
    hits.push({ kind: 'ride', beat, strength: beat % 2 ? .75 : .55 });
    hits.push({ kind: 'brush', beat, strength: beat % 2 ? .6 : .4 });
    if (beat % 2 === 1) {
      hits.push({ kind: 'hat', beat, strength: .28 });
      if (beat + 2 / 3 < beats) hits.push({ kind: 'ride', beat: beat + 2 / 3, strength: .35 });
    }
  }
  return hits.sort((a, b) => a.beat - b.beat);
}

export function makeBrushBuffers(context) {
  const result = {};
  let randomState = 173;
  const noise = () => { randomState = (1664525 * randomState + 1013904223) >>> 0; return randomState / 2147483648 - 1; };
  for (const [kind, seconds] of [['ride', .8], ['brush', .48], ['hat', .12]]) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * seconds), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let smooth = 0;
    for (let i = 0; i < samples.length; i++) {
      const t = i / context.sampleRate;
      const n = noise(); smooth = .88 * smooth + .12 * n;
      if (kind === 'brush') {
        const sweep = Math.sin(Math.PI * Math.min(1, t / seconds)) ** 1.4;
        samples[i] = (n - smooth) * sweep * Math.exp(-t * 3) * .13;
      } else if (kind === 'hat') {
        samples[i] = (n - smooth) * (1 - Math.exp(-t * 1200)) * Math.exp(-t * 48) * .13;
      } else {
        // Inharmonic partials give a soft cymbal shimmer rather than a pitched bell.
        let shimmer = 0;
        for (const frequency of [2300, 3173, 4387, 5819]) {
          if (frequency < context.sampleRate * .45) shimmer += Math.sin(2 * Math.PI * frequency * t) / 4;
        }
        samples[i] = (shimmer * .055 + (n - smooth) * .09) * (1 - Math.exp(-t * 900)) * Math.exp(-t * 8);
      }
    }
    result[kind] = buffer;
  }
  return result;
}

export function scheduleBrushes(context, bus, buffers, timeline, startedAt, offset = 0, track = () => {}) {
  const beatSeconds = timeline.duration / timeline.beats;
  for (const hit of brushPattern(timeline.beats)) {
    if (hit.beat * beatSeconds < offset) continue;
    const at = startedAt + hit.beat * beatSeconds;
    const source = context.createBufferSource(); source.buffer = buffers[hit.kind];
    const gain = context.createGain();
    const end = Math.min(startedAt + timeline.duration, at + source.buffer.length / context.sampleRate);
    gain.gain.setValueAtTime(hit.strength, at);
    gain.gain.setValueAtTime(hit.strength, Math.max(at, end - .015));
    gain.gain.linearRampToValueAtTime(0, end);
    source.connect(gain); gain.connect(bus);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    track(source);
    source.start(at); source.stop(end);
  }
}
