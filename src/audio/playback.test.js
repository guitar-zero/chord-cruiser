import { brushPattern, makeBrushBuffers, scheduleBrushes } from './brushes.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, playbackSongs, chordNotes, bassNote } from './songs.js';
import { JazzPlayer } from './ensemble.js';

test('Source chart durations total 8, 12, and 32 bars', () => {
  for (const [song, bars] of [['autumn-leaves', 8], ['solar', 12], ['take-the-a-train', 32]]) {
    const timeline = buildTimeline(playbackSongs[song], 120);
    assert.equal(timeline.beats, bars * 4);
    assert.equal(timeline.duration, bars * 2);
    assert.equal(timeline.events.at(-1).start + timeline.events.at(-1).duration, timeline.duration);
    for (const event of timeline.events) assert.equal(chordNotes(event.chord).length, 4);
  }
});

test('Solar half-bar changes and repeated bars keep exact timing', () => {
  const { events } = buildTimeline(playbackSongs.solar, 120);
  assert.equal(events[0].duration, 4);
  assert.equal(events[7].chord, 'Ebm7');
  assert.equal(events[7].start, 18);
  assert.equal(events[7].duration, 1);
  assert.equal(events[8].start, 19);
  assert.equal(events[10].start, 22);
  assert.equal(events[11].start, 23);
});

test('A Train includes first and second endings plus the four-bar F6 bridge', () => {
  const { events } = buildTimeline(playbackSongs['take-the-a-train'], 120);
  assert.equal(events.find(e => e.chord === 'Gm7').start, 30);
  assert.equal(events.find(e => e.chord === 'C7').start, 31);
  const bridge = events.find(e => e.section === 'Verse');
  assert.equal(bridge.chord, 'F6'); assert.equal(bridge.start, 32); assert.equal(bridge.duration, 8);
});

test('Voicings preserve minor-major seventh, half-diminished, and alterations', () => {
  assert.deepEqual(chordNotes('CmMaj7'), [48, 59, 63, 67]);
  assert.deepEqual(chordNotes('Dm7b5'), [50, 60, 65, 68]);
  assert.deepEqual(chordNotes('G7b9'), [55, 65, 71, 80]);
  assert.throws(() => chordNotes('invalid'));
});

test('Piano schedules held-bar rearticulations and half-bar notes, pauses, resumes, and stops', async () => {
  const scheduled = [];
  const parameter = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} });
  class Context {
    constructor() { this.currentTime = 0; this.sampleRate = 4000; this.state = 'suspended'; this.destination = {}; }
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
    createBiquadFilter() { return { frequency: parameter(), Q: parameter(), connect() {} }; }
    createDynamicsCompressor() { return { threshold: parameter(), ratio: parameter(), connect() {} }; }
    createBuffer(_, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
    createBufferSource() { const event = {}; scheduled.push(event); return { connect() {}, disconnect() {}, start(at) { event.start = at; }, stop(at) { event.stop = at; } }; }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  }
  globalThis.window = { AudioContext: Context };
  globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
  const guitar = new JazzPlayer({ drums: false, bass: false });
  await guitar.start(buildTimeline([{ chord: 'F6', bars: 4 }, { chord: 'G7', bars: .5 }], 120));
  assert.equal(scheduled.length, 20); // Four piano chords plus the half-bar chord, four strings each.
  assert.equal(scheduled[16].start, 8.03);
  assert.ok(scheduled[16].stop < 9.03);
  assert.ok(guitar.buffer(48).getChannelData(0).some(sample => sample !== 0));
  await guitar.pause(); assert.equal(guitar.context.state, 'suspended');
  guitar.seek(8.5);
  assert.equal(guitar.context.state, 'suspended');
  assert.equal(guitar.elapsed, 8.5);
  assert.equal(scheduled.length, 24); // Only the remaining half-bar chord is rescheduled.
  assert.ok(scheduled.slice(-4).every(note => note.start >= .029 && note.stop < .55));
  assert.ok(scheduled.slice(0, 20).every(note => note.stop === undefined)); // Old voices canceled.

  await guitar.resume(); assert.equal(guitar.context.state, 'running');
  await guitar.stop(); assert.equal(guitar.context.state, 'closed');
  delete globalThis.window;
  delete globalThis.requestAnimationFrame;
});


test('Brush pattern swings gently and stays inside the chord timeline', () => {
  const hits = brushPattern(48);
  assert.equal(hits.filter(hit => hit.kind === 'brush').length, 48);
  assert.equal(hits.filter(hit => hit.kind === 'hat').length, 24);
  assert.ok(hits.some(hit => Math.abs(hit.beat - 1 - 2 / 3) < .00001));
  assert.ok(hits.every(hit => hit.beat >= 0 && hit.beat < 48));
  const scheduled = [];
  const context = {
    sampleRate: 12000,
    createBuffer: (_, length) => ({ length, data: new Float32Array(length), getChannelData() { return this.data; } }),
    createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
    createBufferSource: () => { const hit = {}; scheduled.push(hit); return { connect() {}, disconnect() {}, start(at) { hit.start = at; }, stop(at) { hit.stop = at; } }; },
  };
  const buffers = makeBrushBuffers(context);
  for (const buffer of Object.values(buffers)) {
    assert.ok(buffer.data.some(value => value !== 0));
    assert.ok(buffer.data.every(value => Number.isFinite(value) && Math.abs(value) < .3));
  }
  scheduleBrushes(context, {}, buffers, { beats: 48, duration: 24 }, .07);
  assert.equal(scheduled.length, hits.length);
  assert.ok(scheduled.every(hit => hit.start >= .07 && hit.stop <= 24.07));
});


test('Bass is exactly a perfect fifth below each source-chart root', () => {
  assert.equal(bassNote('Cmaj7'), 41); // F2 below C3.
  assert.equal(bassNote('G7'), 48); // C3 below G3.
  for (const events of Object.values(playbackSongs)) for (const event of events) {
    assert.equal(chordNotes(event.chord)[0] - bassNote(event.chord), 7);
  }
});

test('Playback selects correct graph nodes, including section-specific D7/Dm', async () => {
  const { chartTarget } = await import('./chartTarget.js');
  for (const song of ['solar', 'autumn-leaves']) for (const event of playbackSongs[song]) {
    assert.notEqual(chartTarget(song, event).node, 'unmapped');
  }
  assert.deepEqual(chartTarget('take-the-a-train', { chord: 'D7', section: 'Verse' }), { node: 'd7', section: 'verse' });
  assert.deepEqual(chartTarget('take-the-a-train', { chord: 'Dm7', section: 'Final chorus' }), { node: 'dm', section: 'chorus' });
  assert.equal(chartTarget('take-the-a-train', { chord: 'Gm7', section: 'Chorus · second pass' }).node, 'unmapped');
  assert.equal(chartTarget('solar', null), null);
});
