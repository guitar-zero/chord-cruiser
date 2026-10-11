// Short, diffuse stereo room with a little predelay to preserve the pick attack.
export function jazzRoomImpulse(context) {
  const duration = 1.6, predelay = .018;
  const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * duration), context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let seed = 173 + channel * 7919, smoothed = 0;
    for (let i = Math.ceil(predelay * context.sampleRate); i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      smoothed += .28 * (noise - smoothed);
      const time = i / context.sampleRate - predelay;
      data[i] = smoothed * Math.exp(-time * 4.5);
    }
  }
  return buffer;
}

export function createGuitarMonitor(context, splitter, channel, settings) {
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass'; highpass.frequency.value = 70; highpass.Q.value = .7;
  const warmth = context.createBiquadFilter();
  warmth.type = 'lowshelf'; warmth.frequency.value = 180; warmth.gain.value = 2;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass'; lowpass.frequency.value = 4200; lowpass.Q.value = .7;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18; compressor.knee.value = 18; compressor.ratio.value = 1.8;
  compressor.attack.value = .015; compressor.release.value = .18;
  const dry = context.createGain(), reverb = context.createConvolver(), wet = context.createGain();
  const output = context.createGain();
  output.gain.value = 0;
  dry.gain.value = 1;
  wet.gain.value = 0;
  reverb.buffer = jazzRoomImpulse(context);
  splitter.connect(highpass, channel);
  highpass.connect(warmth); warmth.connect(lowpass); lowpass.connect(compressor);
  compressor.connect(dry); dry.connect(output);
  compressor.connect(reverb); reverb.connect(wet); wet.connect(output);
  output.connect(context.destination);
  let closed = false;
  function set({ enabled = true, volume = .65, reverb: amount = .22 } = {}) {
    if (closed) return;
    output.gain.setTargetAtTime(enabled ? Math.max(0, Math.min(1, volume)) : 0, context.currentTime, .015);
    wet.gain.setTargetAtTime(Math.max(0, Math.min(.6, amount)), context.currentTime, .02);
  }
  set(settings);
  return { set, close() {
    if (closed) return;
    closed = true;
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setValueAtTime(0, context.currentTime);
    splitter.disconnect(highpass, channel);
    for (const node of [highpass, warmth, lowpass, compressor, dry, reverb, wet, output]) node.disconnect();
    reverb.buffer = null;
  } };
}
