export function judgmentCue(result) {
  if (result.missed) return 'buzzer';
  if (result.chord === 'Nope' || result.timing === 'Nope') return 'buzzer';
  if (result.chord === 'Perfect' && result.timing === 'Perfect') return 'ding';
  return null;
}

export function playJudgmentCue(context, result, track = () => {}) {
  const cue = judgmentCue(result);
  if (!cue || context.state !== 'running') return;
  const tones = cue === 'ding' ? [[880, 0, .24, .014], [1320, .045, .2, .008]] : [[145, 0, .13, .009]];
  for (const [frequency, delay, duration, volume] of tones) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    const at = context.currentTime + delay;
    oscillator.type = cue === 'ding' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, at);
    if (cue === 'buzzer') oscillator.frequency.linearRampToValueAtTime(100, at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    track(oscillator);
    oscillator.start(at); oscillator.stop(at + duration + .01);
  }
}
