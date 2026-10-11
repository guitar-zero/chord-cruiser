export function racingCountInTones(onset, beatSeconds) {
  return [8, 7, 6, 5, 4, 3, 2, 1].map(number => ({ at: onset - number * beatSeconds, frequency: number > 3 ? 440 : 660, duration: .1, volume: number > 3 ? .03 : .045 }))
    .concat({ at: onset, frequency: 1320, duration: .25, volume: .055 });
}

export function scheduleRacingCountIn(context, onset, beatSeconds, track) {
  for (const tone of racingCountInTones(onset, beatSeconds)) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.value = tone.frequency;
    gain.gain.setValueAtTime(0, tone.at);
    gain.gain.linearRampToValueAtTime(tone.volume, tone.at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, tone.at + tone.duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    track(oscillator); oscillator.start(tone.at); oscillator.stop(tone.at + tone.duration + .01);
  }
}
