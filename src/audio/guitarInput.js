import { spectralPitches } from './game.js';
import { createGuitarMonitor } from './guitarMonitor.js';

export async function openGuitarInput(deviceId, channel, onFrame, onDisconnect, monitoring) {
  if (!navigator.mediaDevices?.getUserMedia) throw Error('Audio input needs HTTPS or localhost and a browser with audio capture support.');
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw Error('Audio input is unavailable in this browser.');
  const context = new Context({ latencyHint: 'interactive' });
  let stream;
  let monitor;
  try {
    await context.resume();
    stream = await navigator.mediaDevices.getUserMedia({ audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: false, noiseSuppression: false, autoGainControl: false,
    } });
    const source = context.createMediaStreamSource(stream);
    const channelCount = stream.getAudioTracks()[0].getSettings().channelCount || 2;
    if (channel >= channelCount) throw Error(`This input has ${channelCount} channel(s). Select channel 1.`);
    const splitter = context.createChannelSplitter(Math.max(channelCount, 2));
    const analyser = context.createAnalyser();
    analyser.fftSize = 8192;
    analyser.smoothingTimeConstant = 0;
    const envelope = context.createAnalyser();
    envelope.fftSize = 512;
    source.connect(splitter);
    splitter.connect(analyser, channel);
    splitter.connect(envelope, channel);
    // Recognition always receives the dry input, before tone shaping and reverb.
    if (monitoring) monitor = createGuitarMonitor(context, splitter, channel, monitoring);
    const spectrum = new Float32Array(analyser.frequencyBinCount);
    const waveform = new Float32Array(envelope.fftSize);
    let frame, last = 0, baseline = 0, lastAttack = -Infinity, stopped = false;
    function measure(now) {
      if (stopped) return;
      if (now - last >= 16) {
        last = now;
        envelope.getFloatTimeDomainData(waveform);
        const rms = Math.sqrt(waveform.reduce((sum, value) => sum + value * value, 0) / waveform.length);
        const attack = rms > .008 && rms > baseline * 1.65 + .003 && now - lastAttack > 180;
        if (attack) lastAttack = now;
        baseline = baseline * .8 + rms * .2;
        analyser.getFloatFrequencyData(spectrum);
        onFrame({ rms, attack, pitches: spectralPitches(spectrum, context.sampleRate, analyser.fftSize), now });
      }
      frame = requestAnimationFrame(measure);
    }
    frame = requestAnimationFrame(measure);
    for (const track of stream.getTracks()) track.addEventListener('ended', onDisconnect);
    const stateChange = () => { if (context.state !== 'running' && !stopped) onDisconnect(); };
    context.addEventListener('statechange', stateChange);
    return { stream, setMonitoring(settings) {
      if (stopped) return;
      if (!monitor) monitor = createGuitarMonitor(context, splitter, channel, settings);
      else monitor.set(settings);
    }, close() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(frame);
      context.removeEventListener('statechange', stateChange);
      for (const track of stream.getTracks()) { track.removeEventListener('ended', onDisconnect); track.stop(); }
      monitor?.close();
      source.disconnect(); splitter.disconnect();
      void context.close();
    } };
  } catch (error) {
    monitor?.close();
    stream?.getTracks().forEach(track => track.stop());
    void context.close();
    throw error;
  }
}
