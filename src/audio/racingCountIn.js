export function preparationWhistles(start, hereWeGo) {
  return [
    { at: start, frequency: 1800, endFrequency: 2200, duration: .22, volume: .025, type: 'sine' },
    { at: hereWeGo, frequency: 1900, endFrequency: 2350, duration: .12, volume: .025, type: 'sine' },
    { at: hereWeGo + .17, frequency: 2100, endFrequency: 2500, duration: .16, volume: .025, type: 'sine' },
  ];
}

export function racingCountInTones(onset, beatSeconds, preparation) {
  const whistles = preparation ? preparationWhistles(preparation.start, preparation.hereWeGo) : [];
  return whistles.concat([8, 7, 6, 5, 4, 3, 2, 1].map(number => ({ at: onset - number * beatSeconds, frequency: number > 3 ? 440 : 660, duration: .1, volume: number > 3 ? .03 : .045 })))
    .concat({ at: onset, frequency: 1320, duration: .25, volume: .055 });
}

export function scheduleRacingCountIn(context, onset, beatSeconds, track, preparation) {
  for (const tone of racingCountInTones(onset, beatSeconds, preparation)) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = tone.type || 'triangle'; oscillator.frequency.value = tone.frequency;
    if (tone.endFrequency) {
      oscillator.frequency.setValueAtTime(tone.frequency, tone.at);
      oscillator.frequency.linearRampToValueAtTime(tone.endFrequency, tone.at + tone.duration * .6);
    }
    gain.gain.setValueAtTime(0, tone.at);
    gain.gain.linearRampToValueAtTime(tone.volume, tone.at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, tone.at + tone.duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    track(oscillator); oscillator.start(tone.at); oscillator.stop(tone.at + tone.duration + .01);
  }
}
