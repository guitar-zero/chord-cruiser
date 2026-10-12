import { nextShellTarget } from './game.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { chordGrade, timingGrade, shellTargets, spectralPitches, ShellGameRound, normalizeJudgment } from './game.js';
import { buildTimeline } from './songs.js';
import { JazzPlayer } from './ensemble.js';
import { openGuitarInput } from './guitarInput.js';
import { jazzRoomImpulse, createGuitarMonitor } from './guitarMonitor.js';
import { judgmentCue, playJudgmentCue } from './gameCues.js';
import { pianoHits } from './pianoVoicings.js';
import { countInComplete, countInBeat, countInLabel, countInChords, countInSchedule, shouldLaunchCountInIndicator } from './countIn.js';
import { gameBarState } from '../data/gameBar.js';
import { racingCountInTones, scheduleRacingCountIn, preparationWhistles } from './racingCountIn.js';

test('Indicator launches when the eight balls start, with a fallback after a delayed frame', () => {
  assert.equal(shouldLaunchCountInIndicator(6, .5), false);
  assert.equal(shouldLaunchCountInIndicator(4.01, .5), false);
  assert.equal(shouldLaunchCountInIndicator(4, .5), true);
  assert.equal(shouldLaunchCountInIndicator(-.1, .5), true);
  assert.equal(shouldLaunchCountInIndicator(-Infinity, .5), false);
  assert.equal(shouldLaunchCountInIndicator(2, .25), true);
});

test('Preparation adds short rising whistles without shifting the countdown or first-chord cue', () => {
  const whistles = preparationWhistles(1, 3);
  assert.deepEqual(whistles.map(tone => tone.at), [1, 3, 3.17]);
  assert.ok(whistles.every(tone => tone.endFrequency > tone.frequency && tone.volume <= .025 && tone.duration <= .22));
  const tones = racingCountInTones(8, .5, { start: 1, hereWeGo: 3 });
  assert.equal(tones.length, 12);
  assert.equal(tones[3].at, 4);
  assert.equal(tones.at(-1).at, 8);
});
import { PlaybackRenderGate } from './playbackRenderGate.js';

test('Playback UI throttles repeat frames but publishes every chord boundary, loop, and seek', () => {
  const gate = new PlaybackRenderGate();
  assert.equal(gate.shouldRender(0, 0), true);
  assert.equal(gate.shouldRender(16, 0), false);
  assert.equal(gate.shouldRender(34, 0), true);
  assert.equal(gate.shouldRender(40, 1), true);
  assert.equal(gate.shouldRender(50, 1), false);
  assert.equal(gate.shouldRender(51, 1, true), true);
  assert.equal(gate.shouldRender(52, 0), true);
  assert.equal(new PlaybackRenderGate().shouldRender(53, 0), true);
});

test('Racing count-in schedules eight beat beeps and a higher GO exactly on the first chord', () => {
  const tones = racingCountInTones(10, .5);
  assert.deepEqual(tones.map(tone => tone.at), [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]);
  assert.deepEqual(tones.map(tone => tone.frequency), [440, 440, 440, 440, 440, 660, 660, 660, 1320]);
  assert.ok(tones.at(-1).duration > tones[0].duration);
  const starts = [], tracked = [];
  const context = {
    destination: {},
    createOscillator: () => ({ frequency: {}, connect() {}, disconnect() {}, start(at) { starts.push(at); }, stop() {} }),
    createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
  };
  scheduleRacingCountIn(context, 10, .5, source => tracked.push(source));
  assert.deepEqual(starts, [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]);
  assert.equal(tracked.length, 9);
});

test('Game bar reports bars and stages correctly through section changes and song end', () => {
  const timeline = { duration: 8, beats: 16, beatsPerBar: 4 };
  const segments = [{ start: 0, end: 4 }, { start: 4, end: 8 }];
  assert.deepEqual(gameBarState(timeline, segments, 0), { index: 0, bar: 1, bars: 4, percent: 0 });
  assert.deepEqual(gameBarState(timeline, segments, 4), { index: 1, bar: 3, bars: 4, percent: 50 });
  assert.deepEqual(gameBarState(timeline, segments, 8), { index: 1, bar: 4, bars: 4, percent: 100 });
});

test('Ready overlay previews the starting playable chord and the next, including seeks and loops', () => {
  const targets = [{ chord: 'C7', start: 0, duration: 4 }, { chord: 'F7', start: 5, duration: 2 }];
  assert.deepEqual(countInChords(targets, 0, 7), targets);
  assert.deepEqual(countInChords(targets, 2, 7), targets);
  assert.deepEqual(countInChords(targets, 4.5, 7), [targets[1], targets[0]]);
  assert.deepEqual(countInChords(targets, 7, 7), targets);
  assert.deepEqual(countInChords([], 0, 7), []);
});

test('Visual count-in says Get ready, Here we go, then eight numbered beats before onset', () => {
  assert.deepEqual([7, 5, 4, 3.5, 3, 2.5, 2, 1.5, 1, .5, 0].map(seconds => countInLabel(countInBeat(seconds, .5))), ['Get ready', 'Here we go', '8', '7', '6', '5', '4', '3', '2', '1', null]);
  assert.equal(countInBeat(7.03, .5), 14);
  assert.equal(countInBeat(-.02, .5), 0);
  assert.equal(countInLabel(countInBeat(1.2, .4), .4), '3');
});

test('Ready phrases give preparation time at every tempo before eight beat-aligned beeps', () => {
  for (const bpm of [40, 120, 240]) {
    const beatSeconds = 60 / bpm;
    const schedule = countInSchedule(beatSeconds);
    assert.ok((schedule.introBeats - schedule.hereWeGoBeats) * beatSeconds >= 2);
    assert.ok(schedule.hereWeGoBeats * beatSeconds >= 1);
    assert.equal(schedule.totalBeats - schedule.introBeats, 8);
    assert.equal(countInLabel(8, beatSeconds), '8');
  }
});

test('Game piano strikes once per node visit, including held chords and half-bar changes', () => {
  const timeline = buildTimeline([
    { chord: 'C7', nodeId: 'c', bars: 4 },
    { chord: 'F7', nodeId: 'f', bars: .5 },
    { chord: 'C7', nodeId: 'c', bars: .5 },
    { chord: 'G7', nodeId: null, bars: 1 },
    { chord: 'NC', nodeId: null, bars: 1 },
  ], 120);
  const hits = pianoHits(timeline, { nodesOnly: true });
  assert.deepEqual(hits.map(hit => hit.start), [0, 8, 9]);
  assert.deepEqual(hits.map(hit => hit.duration), [8, 1, 1]);
  assert.equal(pianoHits(timeline).length, 7);
});

test('Audio cues distinguish double Perfect, either Nope, and ordinary judgments', () => {
  assert.equal(judgmentCue({ missed: true, chord: null, timing: null }), 'buzzer');
  assert.equal(judgmentCue({ chord: 'Perfect', timing: 'Perfect' }), 'ding');
  assert.equal(judgmentCue({ chord: 'Nope', timing: 'Perfect' }), 'buzzer');
  assert.equal(judgmentCue({ chord: 'Perfect', timing: 'Nope' }), 'buzzer');
  assert.equal(judgmentCue({ chord: 'Nope', timing: 'Nope' }), 'buzzer');
  assert.equal(judgmentCue({ chord: 'Great', timing: 'Perfect' }), null);
  assert.equal(judgmentCue({ chord: 'Good', timing: 'Great' }), null);
});

test('Silence and double Nope become a single total miss without individual grades', () => {
  for (const result of [{ missed: true }, { chord: 'Nope', timing: 'Nope', playedPitches: [1, 2], offset: .4 }]) {
    const miss = normalizeJudgment(result);
    assert.equal(miss.missed, true);
    assert.equal(miss.chord, null); assert.equal(miss.timing, null);
    assert.deepEqual(miss.playedPitches, []);
    assert.equal(miss.offset, undefined);
    assert.equal(judgmentCue(miss), 'buzzer');
  }
  const mixed = { chord: 'Nope', timing: 'Perfect' };
  assert.deepEqual(normalizeJudgment(mixed), mixed);
});

test('Noise without detected notes releases the target for a retry or a total miss', () => {
  const target = { index: 0, start: 1 };
  const round = new ShellGameRound([target]);
  assert.ok(round.attack(1));
  round.releaseAttack(0);
  assert.ok(round.attack(1.2));
  round.releaseAttack(0);
  assert.deepEqual(round.misses(1.51), [target]);
  assert.deepEqual(round.misses(2), []);
});

test('Judgment sounds are quiet, short, tracked, and silent while paused', () => {
  const oscillators = [], peaks = [], tracked = [];
  const context = {
    state: 'running', currentTime: 1, destination: {},
    createOscillator() {
      const oscillator = { frequency: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {}, start(at) { this.at = at; }, stop(at) { this.end = at; } };
      oscillators.push(oscillator); return oscillator;
    },
    createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime(value) { peaks.push(value); }, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
  };
  playJudgmentCue(context, { chord: 'Perfect', timing: 'Perfect' }, source => tracked.push(source));
  assert.equal(oscillators.length, 2);
  assert.equal(tracked.length, 2);
  assert.ok(peaks.every(value => value <= .014));
  assert.ok(oscillators.every(oscillator => oscillator.end - oscillator.at < .3));
  playJudgmentCue(context, { chord: 'Nope', timing: 'Great' });
  assert.equal(oscillators.at(-1).type, 'triangle');
  context.state = 'suspended';
  playJudgmentCue(context, { chord: 'Perfect', timing: 'Perfect' });
  assert.equal(oscillators.length, 3);
});

function monitorContext() {
  const nodes = [];
  const param = () => ({ value: 0, changes: [], setTargetAtTime(value) { this.changes.push(value); }, cancelScheduledValues() {}, setValueAtTime(value) { this.value = value; } });
  const node = type => {
    const value = { type, connections: [], disconnected: false, connect(target, channel) { this.connections.push({ target, channel }); }, disconnect() { this.disconnected = true; } };
    nodes.push(value); return value;
  };
  const context = {
    sampleRate: 48000, currentTime: 1, destination: {},
    createBuffer(channels, length, sampleRate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate, getChannelData: index => data[index] };
    },
    createBiquadFilter: () => Object.assign(node('filter'), { frequency: param(), Q: param(), gain: param() }),
    createDynamicsCompressor: () => Object.assign(node('compressor'), { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }),
    createGain: () => Object.assign(node('gain'), { gain: param() }),
    createConvolver: () => node('convolver'),
  };
  return { context, nodes };
}

test('Jazz reverb has stereo diffusion, predelay, and a bounded decaying tail', () => {
  const { context } = monitorContext();
  const impulse = jazzRoomImpulse(context);
  assert.equal(impulse.numberOfChannels, 2);
  assert.equal(impulse.length, 76800);
  const left = impulse.getChannelData(0), right = impulse.getChannelData(1);
  assert.ok(left.every(Number.isFinite));
  assert.ok(left.slice(0, 864).every(value => value === 0));
  assert.notDeepEqual(left.slice(864, 900), right.slice(864, 900));
  const energy = samples => samples.reduce((sum, value) => sum + value * value, 0);
  assert.ok(energy(left.slice(48000)) < energy(left.slice(864, 24000)) * .01);
});

test('Jazz monitoring has independent dry/wet paths, live mute, and complete cleanup', () => {
  const { context, nodes } = monitorContext();
  const splitter = { connections: [], disconnects: [], connect(target, channel) { this.connections.push({ target, channel }); }, disconnect(target, channel) { this.disconnects.push({ target, channel }); } };
  const monitor = createGuitarMonitor(context, splitter, 1, { enabled: true, volume: .65, reverb: .22 });
  const compressor = nodes.find(node => node.type === 'compressor');
  const convolver = nodes.find(node => node.type === 'convolver');
  const output = nodes.find(node => node.connections.some(connection => connection.target === context.destination));
  const wet = convolver.connections[0].target;
  assert.equal(splitter.connections[0].channel, 1);
  assert.equal(compressor.connections.length, 2);
  assert.ok(compressor.connections.some(connection => connection.target === convolver));
  assert.deepEqual(output.gain.changes, [.65]);
  assert.deepEqual(wet.gain.changes, [.22]);
  monitor.set({ enabled: false, volume: .9, reverb: .4 });
  assert.equal(output.gain.changes.at(-1), 0);
  monitor.set({ enabled: true, volume: .8, reverb: .1 });
  assert.equal(output.gain.changes.at(-1), .8);
  assert.equal(wet.gain.changes.at(-1), .1);
  monitor.close(); monitor.close();
  assert.equal(output.gain.value, 0);
  assert.equal(convolver.buffer, null);
  assert.ok(nodes.every(node => node.disconnected));
  assert.equal(splitter.disconnects.length, 1);
});

test('Shell correctness accepts inversions and octaves, but separates missing and extra notes', () => {
  const expected = [0, 4, 10];
  assert.equal(chordGrade([70, 64, 48], expected), 'Perfect');
  assert.equal(chordGrade([0, 4, 10, 7], expected), 'Great');
  assert.equal(chordGrade([0, 4], expected), 'Good');
  assert.equal(chordGrade([0], expected), 'Okay');
  assert.equal(chordGrade([2, 6, 9], expected), 'Nope');
  assert.equal(chordGrade([], expected), 'Nope');
});

test('Timing grades use absolute onset error independently of chord recognition', () => {
  for (const [offset, grade] of [[.1, 'Perfect'], [.15, 'Perfect'], [.151, 'Great'], [.2, 'Great'], [.201, 'Good'], [.3, 'Good'], [.301, 'Okay'], [.45, 'Okay'], [.451, 'Nope']]) {
    assert.equal(timingGrade(offset), grade);
    assert.equal(timingGrade(-offset), grade);
  }
  assert.equal(timingGrade(0), 'Perfect');
});

test('Game targets use the exact displayed shell and count held bars once', () => {
  const timeline = buildTimeline([
    { chord: 'C7', nodeId: 'c', bars: 2 },
    { chord: 'Cmaj7', nodeId: 'maj', bars: .5 },
    { chord: 'NC', nodeId: null, bars: .5 },
    { chord: 'C7sus4', nodeId: 'sus', bars: 1 },
  ], 120);
  const nodes = ['c', 'maj', 'sus'].map(id => ({ id, string: 'A', fret: 3 }));
  const targets = shellTargets(timeline, nodes);
  assert.equal(targets.length, 2);
  assert.deepEqual([...targets[0].pitches].sort((a,b) => a-b), [0, 4, 10]);
  assert.deepEqual([...targets[1].pitches].sort((a,b) => a-b), [0, 4, 11]);
  assert.equal(targets[1].start, 4);
});

test('Attempts claim a visit once; wrong notes can still have Perfect timing', () => {
  const target = { index: 0, start: 1, pitches: [0, 4, 10] };
  const round = new ShellGameRound([target]);
  assert.equal(round.attack(1).timing, 'Perfect');
  assert.equal(chordGrade([2, 6, 9], target.pitches), 'Nope');
  assert.equal(round.attack(1.1), null);
  assert.deepEqual(round.misses(2), []);
});

test('Early/late attempts, misses, half-bar visits, and seek resets have separate targets', () => {
  const targets = [{ index: 0, start: 0 }, { index: 1, start: 1 }, { index: 2, start: 2 }];
  const round = new ShellGameRound(targets);
  assert.equal(round.attack(-.15).timing, 'Perfect');
  assert.equal(round.attack(.95).target.index, 1);
  assert.deepEqual(round.misses(2.49), []);
  assert.deepEqual(round.misses(2.51), [targets[2]]);
  assert.deepEqual(round.misses(3), []);
  const seek = new ShellGameRound(targets, 1.5);
  assert.deepEqual(seek.misses(2.6), [targets[2]]);
  assert.equal(new ShellGameRound(targets).attack(0).target.index, 0);
});

function spectrumFor(midis, harmonics = false) {
  const spectrum = new Float32Array(4096).fill(-100);
  for (const midi of midis) {
    const fundamental = 440 * 2 ** ((midi - 69) / 12);
    for (const harmonic of harmonics ? [1, 2, 3, 4] : [1]) {
      const center = fundamental * harmonic / (48000 / 8192);
      for (let bin = Math.max(1, Math.floor(center) - 2); bin <= Math.ceil(center) + 2; bin++) {
        const db = -22 - 8 * Math.log2(harmonic) - 12 * (bin - center) ** 2;
        spectrum[bin] = Math.max(spectrum[bin], db);
      }
    }
  }
  return spectrum;
}

test('Spectral detector finds shell pitch classes and suppresses generated overtones', () => {
  for (const midis of [[48, 64, 70], [46, 62, 68], [52, 67, 74]]) {
    const expected = [...new Set(midis.map(midi => midi % 12))].sort((a,b) => a-b);
    assert.deepEqual(spectralPitches(spectrumFor(midis), 48000, 8192), expected);
    assert.deepEqual(spectralPitches(spectrumFor(midis, true), 48000, 8192), expected);
  }
  assert.deepEqual(spectralPitches(new Float32Array(4096).fill(-Infinity), 48000, 8192), []);
});

test('Count-in shifts scheduled chord onset without changing timeline or seek behavior', () => {
  const starts = [];
  const context = {
    currentTime: 10,
    createOscillator: () => ({ frequency: {}, connect() {}, disconnect() {}, start(at) { starts.push(at); }, stop() {} }),
    createGain: () => ({ gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
  };
  const player = Object.assign(Object.create(JazzPlayer.prototype), {
    context, timeline: { duration: 10 }, sources: new Set(), pianoHits: [], beatSeconds: .5,
  });
  player.seek(0, 2);
  assert.equal(player.startedAt, 12.03);
  assert.deepEqual(starts, [10.03, 10.53, 11.03, 11.53]);
  for (const source of player.sources) source.stop = () => {};
  player.seek(3);
  assert.ok(Math.abs(player.startedAt - 7.03) < 1e-9);
});

test('Game drums cover all eight countdown beeps and continue without a duplicate downbeat', () => {
  const hits = [];
  const parameter = { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
  const context = {
    currentTime: 10, sampleRate: 8000, destination: {},
    createOscillator: () => ({ frequency: { ...parameter }, connect() {}, disconnect() {}, start() {}, stop() {} }),
    createGain: () => ({ gain: { ...parameter }, connect() {}, disconnect() {} }),
    createBufferSource: () => ({ connect() {}, disconnect() {}, start(at) { hits.push({ kind: this.buffer.kind, at }); }, stop() {} }),
  };
  const player = Object.assign(Object.create(JazzPlayer.prototype), {
    context, timeline: { duration: 8, beats: 16, beatsPerBar: 4 }, sources: new Set(), pianoHits: [],
    beatSeconds: .5, racingCountIn: true,
    brushes: Object.fromEntries(['ride', 'brush', 'hat'].map(kind => [kind, { kind, length: 4000 }])),
  });
  player.seek(3, 7);
  const onset = player.countInEndsAt;
  const rideBeats = hits.filter(hit => hit.kind === 'ride').map(hit => hit.at);
  for (const beatsBefore of [8, 7, 6, 5, 4, 3, 2, 1]) assert.ok(rideBeats.some(at => Math.abs(at - (onset - beatsBefore * .5)) < 1e-9));
  assert.ok(Math.abs(Math.min(...hits.map(hit => hit.at)) - (onset - 4)) < 1e-9);
  assert.equal(rideBeats.filter(at => Math.abs(at - onset) < 1e-9).length, 1);
  const loopBoundary = player.startedAt + player.timeline.duration;
  assert.equal(rideBeats.filter(at => Math.abs(at - loopBoundary) < 1e-9).length, 1);
  assert.ok(rideBeats.some(at => Math.abs(at - (loopBoundary - .5)) < 1e-9));
  context.currentTime = loopBoundary + .125;
  assert.equal(player.loopPosition().wrapped, true);
  assert.equal(player.startedAt, loopBoundary);
  assert.equal(hits.filter(hit => hit.kind === 'ride' && Math.abs(hit.at - loopBoundary) < 1e-9).length, 1);
  hits.length = 0;
  player.seek(3);
  assert.ok(hits.every(hit => hit.at >= context.currentTime));
});

test('Interface capture selects the channel, disables speech processing, and releases input', async () => {
  const descriptors = Object.fromEntries(['window', 'navigator', 'requestAnimationFrame', 'cancelAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let constraints, stopped = 0, closed = 0, cancelled = 0, selectedChannel;
  const connections = [];
  const track = { getSettings: () => ({ channelCount: 2 }), addEventListener() {}, removeEventListener() {}, stop() { stopped++; } };
  class Context {
    sampleRate = 48000;
    state = 'running';
    destination = {};
    resume() { return Promise.resolve(); }
    close() { closed++; return Promise.resolve(); }
    addEventListener() {}
    removeEventListener() {}
    createMediaStreamSource() { return { connect(node) { connections.push(node); }, disconnect() {} }; }
    createChannelSplitter() { return { connect(node, channel) { selectedChannel = channel; connections.push(node); }, disconnect() {} }; }
    createAnalyser() { return { fftSize: 8192, frequencyBinCount: 4096 }; }
  }
  try {
    for (const [key, value] of Object.entries({
      window: { AudioContext: Context },
      navigator: { mediaDevices: { async getUserMedia(value) { constraints = value; return { getAudioTracks: () => [track], getTracks: () => [track] }; } } },
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => { cancelled++; },
    })) Object.defineProperty(globalThis, key, { configurable: true, value });
    const connection = await openGuitarInput('interface', 1, () => {}, () => {});
    assert.deepEqual(constraints.audio, { deviceId: { exact: 'interface' }, echoCancellation: false, noiseSuppression: false, autoGainControl: false });
    assert.equal(selectedChannel, 1);
    assert.equal(connections.length, 3); // Source → splitter → two analysers, never speakers.
    connection.close();
    assert.equal(stopped, 1); assert.equal(closed, 1); assert.equal(cancelled, 1);
    track.getSettings = () => ({ channelCount: 1 });
    await assert.rejects(openGuitarInput('interface', 1, () => {}, () => {}), /Select channel 1/);
    assert.equal(stopped, 2); assert.equal(closed, 2);
    navigator.mediaDevices.getUserMedia = async () => { throw Error('Permission denied'); };
    await assert.rejects(openGuitarInput('', 0, () => {}, () => {}), /Permission denied/);
    assert.equal(closed, 3);
  } finally {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test('Game chord preview advances by visit, skips omitted chords, and wraps at song end', () => {
  const targets = [{ index: 0, nodeId: 'a' }, { index: 3, nodeId: 'b' }, { index: 4, nodeId: 'a' }];
  assert.equal(nextShellTarget(targets, 0, false), targets[0]);
  assert.equal(nextShellTarget(targets, 3, false), targets[0]);
  assert.equal(nextShellTarget(targets, 0), targets[1]);
  assert.equal(nextShellTarget(targets, 2), targets[1]);
  assert.equal(nextShellTarget(targets, 3), targets[2]);
  assert.equal(nextShellTarget(targets, 4), targets[0]);
  assert.equal(nextShellTarget([], 0), undefined);
});

test('Countdown audio cannot claim the first chord before GO; silence becomes a miss', () => {
  const target = { index: 0, start: 0, pitches: [0, 4, 11] };
  const round = new ShellGameRound([target]);
  const go = 10;
  for (const time of [0, 5, 9.6, 9.99]) {
    if (countInComplete(time, go)) round.attack(time - go);
  }
  assert.equal(round.claimed.size, 0);
  assert.deepEqual(round.misses(.51), [target]);
  assert.equal(countInComplete(go, go), true);
  assert.equal(countInComplete(go + .1, go), true);
  assert.equal(countInComplete(0, null), true);
  assert.equal(new ShellGameRound([target]).attack(0).timing, 'Perfect');
});
