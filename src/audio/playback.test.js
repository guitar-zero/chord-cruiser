import { brushPattern, makeBrushBuffers, scheduleBrushes } from './brushes.js';
import { chordProgress, pipeProgress, beatCountdown } from './pipeProgress.js';

test('Node countdown pulses on musical beats and counts complete holds', () => {
  assert.deepEqual(beatCountdown({ beats: 8, progress: .25, position: 1, bpm: 120 }), { beatsLeft: 6, phase: 0 });
  assert.deepEqual(beatCountdown({ beats: 2, progress: .25, position: .25, bpm: 120 }), { beatsLeft: 2, phase: .5 });
  assert.deepEqual(beatCountdown({ beats: 4, progress: .75, position: 3, bpm: 60 }), { beatsLeft: 1, phase: 0 });
  assert.equal(beatCountdown({ beats: 4, progress: 1, position: 2, bpm: 120 }).beatsLeft, 0);
});

test('Pipe fill follows held and half-bar chord timing and stays full during travel and looping', () => {
  const timeline=buildTimeline([{nodeId:'a',bars:2},{nodeId:'b',bars:.5}],120);
  assert.equal(chordProgress(timeline.events[0],2),.5);
  assert.equal(chordProgress(timeline.events[0],4),1);
  assert.equal(chordProgress(timeline.events[1],4.5),.5);
  assert.equal(chordProgress(timeline.events[1],5),1);
  assert.equal(chordProgress(timeline.events[1],3),0);
  assert.equal(pipeProgress(0,{visitIndex:0,seekVersion:0,progress:.5},0),.5);
  assert.equal(pipeProgress(0,{visitIndex:1,seekVersion:0,progress:.1},0),1);
  assert.equal(pipeProgress(1,{visitIndex:0,seekVersion:1,progress:.1},0),1);
  assert.equal(pipeProgress(0,{visitIndex:0,seekVersion:2,progress:.25},2),.25);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, playbackSongs, chordNotes, bassNote } from './songs.js';
import { pianoHits, pianoVoicing } from './pianoVoicings.js';
import { shortcutKey } from '../keyboardShortcuts.js';

test('Letter shortcuts ignore text entry, repeated keys, composition, and browser modifiers', () => {
  assert.equal(shortcutKey({ key: 'm' }), 'm');
  assert.equal(shortcutKey({ key: 'x' }), 'x');
  assert.equal(shortcutKey({ key: 'd', target: { closest: () => ({}) } }), null);
  for (const flag of ['repeat', 'isComposing', 'defaultPrevented', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey']) {
    assert.equal(shortcutKey({ key: 'm', [flag]: true }), null);
  }
});

test('Repeated piano hits vary inversions without changing harmony, rhythm, or slash bass', () => {
  const pitchClasses = notes => notes.map(note => note % 12).sort((a, b) => a - b);
  for (const chord of ['CmMaj7', 'Dm7b5', 'G7b9', 'C13#11', 'C7/E']) {
    const original = pianoVoicing(chord);
    const inverted = pianoVoicing(chord, 1);
    assert.notDeepEqual(inverted, original);
    assert.deepEqual(pitchClasses(inverted), pitchClasses(original));
    if (chord.includes('/')) assert.equal(inverted[0], original[0]);
  }
  const hits = pianoHits(buildTimeline([{ chord: 'F6', bars: 2 }, { chord: 'F6', bars: .5 }, { chord: 'G7', bars: .5 }], 120));
  assert.deepEqual(hits.map(hit => [hit.start, hit.duration]), [[0, 2], [2, 2], [4, 1], [5, 1]]);
  assert.deepEqual(hits.map(hit => hit.notes), [pianoVoicing('F6'), pianoVoicing('F6', 1), pianoVoicing('F6', 2), pianoVoicing('G7')]);
  assert.deepEqual(pianoVoicing('NC', 1), []);
});
import { JazzPlayer } from './ensemble.js';
import { sectionTimeline } from './sectionTimeline.js';
import { miniProgressState } from '../miniProgressState.js';
import { isPlaybackAdvance, retainTransitionPipe } from '../data/playbackTransition.js';

test('Transition pipe survives flight setup and handoff until destination arrival', () => {
  const bridge = { visitIndex: 3, seekVersion: 0, loopIteration: 0 };
  const current = { node: 'destination', visitIndex: 4, seekVersion: 0, loopIteration: 0 };
  const oldArrival = { node: 'source', visitIndex: 3, seekVersion: 0 };
  assert.equal(retainTransitionPipe(bridge, current, oldArrival, 8), true);
  assert.equal(retainTransitionPipe(bridge, current, oldArrival, 8, true), true);
  assert.equal(retainTransitionPipe(bridge, current, current, 8, true), true);
  assert.equal(retainTransitionPipe(bridge, current, current, 8), false);
  assert.equal(retainTransitionPipe(bridge, { ...current, seekVersion: 1 }, oldArrival, 8), false);
  assert.equal(retainTransitionPipe(bridge, null, oldArrival, 8), false);
});

test('Loop travel distinguishes automatic wraps from manual seeks back to the start', () => {
  const last = { visitIndex: 7, seekVersion: 2, loopIteration: 0 };
  assert.equal(isPlaybackAdvance(last, { visitIndex: 0, seekVersion: 3, loopIteration: 1 }, 8), true);
  assert.equal(isPlaybackAdvance(last, { visitIndex: 0, seekVersion: 3, loopIteration: 0 }, 8), false);
  assert.equal(isPlaybackAdvance({ visitIndex: 2, seekVersion: 2, loopIteration: 0 }, { visitIndex: 3, seekVersion: 2, loopIteration: 0 }, 8), true);
  assert.equal(isPlaybackAdvance(null, last, 8), false);
});

test('Mini progress dismissal lasts until the main bar returns to view', () => {
  let state = miniProgressState({ visible: true, dismissed: false }, { type: 'visibility', visible: false });
  assert.deepEqual(state, { visible: false, dismissed: false });
  state = miniProgressState(state, { type: 'dismiss' });
  state = miniProgressState(state, { type: 'visibility', visible: false });
  assert.deepEqual(state, { visible: false, dismissed: true });
  state = miniProgressState(state, { type: 'visibility', visible: true });
  assert.deepEqual(state, { visible: true, dismissed: false });
  state = miniProgressState(state, { type: 'visibility', visible: false });
  assert.deepEqual(state, { visible: false, dismissed: false });
});

test('Progress sections follow timed graph visits, including holds, omitted chords, and returns', () => {
  const song = { nodes: [{ id: 'a', section: 'verse' }, { id: 'b', section: 'chorus' }], layout: { sections: [{ id: 'verse', title: 'Verse' }, { id: 'chorus', title: 'Chorus' }] } };
  const timeline = buildTimeline([{ nodeId: 'a', bars: 2 }, { nodeId: null, bars: .5 }, { nodeId: 'b', bars: 1 }, { nodeId: 'a', bars: 1 }], 120);
  assert.deepEqual(sectionTimeline(timeline, song), [
    { id: 'verse', start: 0, end: 5, label: 'Section 1 · Verse' },
    { id: 'chorus', start: 5, end: 7, label: 'Section 2 · Chorus' },
    { id: 'verse', start: 7, end: 9, label: 'Section 1 · Verse' },
  ]);
});

test('Source chart durations total 32, 12, and 32 bars', () => {
  for (const [song, bars] of [['autumn-leaves', 32], ['solar', 12], ['take-the-a-train', 32]]) {
    const timeline = buildTimeline(playbackSongs[song], 120);
    assert.equal(timeline.beats, bars * 4);
    assert.equal(timeline.duration, bars * 2);
    assert.equal(timeline.events.at(-1).start + timeline.events.at(-1).duration, timeline.duration);
    for (const event of timeline.events) assert.ok(chordNotes(event.chord).length >= 4);
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

test('A Train includes first and second endings plus the canonical four-bar Fmaj7 bridge', () => {
  const { events } = buildTimeline(playbackSongs['take-the-a-train'], 120);
  assert.equal(events.find(e => e.chord === 'Gm7').start, 30);
  assert.equal(events.find(e => e.chord === 'C7').start, 31);
  const bridge = events.find(e => e.section === 'B');
  assert.equal(bridge.chord, 'Fmaj7'); assert.equal(bridge.start, 32); assert.equal(bridge.duration, 8);
});

test('Voicings preserve minor-major seventh, half-diminished, and alterations', () => {
  assert.deepEqual(chordNotes('CmMaj7'), [48, 59, 63, 67]);
  assert.deepEqual(chordNotes('Dm7b5'), [50, 60, 65, 68]);
  assert.deepEqual(chordNotes('G7b9'), [55, 65, 71, 80]);
  assert.throws(() => chordNotes('invalid'));
});

test('Piano schedules held-bar rearticulations and half-bar notes, pauses, resumes, and stops', async () => {
  const scheduled = [];
  const parameter = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime() {} });
  class Context {
    constructor() { this.currentTime = 0; this.sampleRate = 4000; this.state = 'suspended'; this.destination = {}; }
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
    createBiquadFilter() { return { frequency: parameter(), Q: parameter(), connect() {} }; }
    createDynamicsCompressor() { return { threshold: parameter(), ratio: parameter(), connect() {} }; }
    createBuffer(_, length) { const data = new Float32Array(length); return { getChannelData: () => data }; }
    createBufferSource() { const event = {}; scheduled.push(event); return { set buffer(value) { event.buffer = value; }, connect() {}, disconnect() {}, start(at) { event.start = at; }, stop(at) { event.stop = at; } }; }
    async resume() { this.state = 'running'; }
    async suspend() { this.state = 'suspended'; }
    async close() { this.state = 'closed'; }
  }
  globalThis.window = { AudioContext: Context };
  globalThis.requestAnimationFrame = callback => setTimeout(callback, 0);
  const guitar = new JazzPlayer({ drums: false, bass: false });
  await guitar.start(buildTimeline([{ chord: 'F6', bars: 4 }, { chord: 'G7', bars: .5 }], 120));
  assert.equal(scheduled.length, 40); // Current and next pass are queued before the loop boundary.
  assert.deepEqual(scheduled.slice(4, 8).map(note => note.buffer), pianoVoicing('F6', 1).map(note => guitar.buffer(note)));
  assert.equal(scheduled[16].start, 8.03);
  assert.ok(scheduled[16].stop < 9.03);
  assert.ok(guitar.buffer(48).getChannelData(0).some(sample => sample !== 0));
  await guitar.pause(); assert.equal(guitar.context.state, 'suspended');
  guitar.seek(8.5);
  assert.equal(guitar.context.state, 'suspended');
  assert.equal(guitar.elapsed, 8.5);
  assert.equal(scheduled.length, 64); // Remaining half-bar plus the complete next pass.
  assert.ok(scheduled.slice(40, 44).every(note => note.start >= .029 && note.stop < .55));
  assert.ok(scheduled.slice(0, 40).every(note => note.stop === undefined)); // Old voices canceled.

  await guitar.resume(); assert.equal(guitar.context.state, 'running');
  guitar.context.currentTime = guitar.startedAt + guitar.timeline.duration + .125;
  const beforeLoop = scheduled.length;
  const boundary = guitar.startedAt + guitar.timeline.duration;
  const queuedDownbeat = scheduled.find(note => Math.abs(note.start - boundary) < 1e-9);
  assert.ok(queuedDownbeat); // First beat exists before a delayed UI frame observes the wrap.
  const queuedStop = queuedDownbeat.stop;
  const loop = guitar.loopPosition();
  assert.equal(loop.wrapped, true);
  assert.ok(Math.abs(loop.position - .125) < 1e-9);
  assert.ok(scheduled.length > beforeLoop); // New first-chord voices are scheduled.
  assert.equal(guitar.context.state, 'running');
  assert.equal(guitar.startedAt, boundary);
  assert.equal(queuedDownbeat.stop, queuedStop); // Wrapping does not cancel the downbeat.
  assert.equal(guitar.loopPosition().wrapped, false);
  guitar.context.currentTime = guitar.startedAt + guitar.timeline.duration * 3;
  assert.equal(guitar.loopPosition().position, 0); // Exact boundary, even after a delayed frame.
  await guitar.stop(); assert.equal(guitar.context.state, 'closed');
  assert.equal(guitar.sources.size, 0);
  assert.equal(guitar.master.gain.value, 0);
  assert.equal(guitar.drumBus.gain.value, 0);
  assert.equal(guitar.bassBus.gain.value, 0);
  const stoppedCount = scheduled.length;
  const loadingPlayer = new JazzPlayer({ drums: false, bass: false });
  const preparation = loadingPlayer.start(buildTimeline([{ chord: 'C6', bars: 1 }],120));
  await loadingPlayer.stop();
  await preparation;
  assert.equal(scheduled.length, stoppedCount); // Changing songs while loading cannot start old audio.
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
    if (event.chord === 'NC') { assert.deepEqual(chordNotes('NC'), []); assert.equal(bassNote('NC'), null); continue; }
    assert.equal(chordNotes(event.chord.split('/')[0])[0] - bassNote(event.chord), 7);
  }
});

test('Playback selects correct graph nodes, including section-specific D7/Dm', async () => {
  const { chartTarget } = await import('./chartTarget.js');
  for (const song of ['solar', 'autumn-leaves']) for (const event of playbackSongs[song]) {
    assert.notEqual(chartTarget(song, event).node, 'unmapped');
  }
  for (const event of playbackSongs['take-the-a-train']) {
    assert.equal(chartTarget('take-the-a-train', event).node, event.nodeId);
    assert.notEqual(event.nodeId, null);
  }
  const dominant = chartTarget('take-the-a-train', { chord: 'D7', section: 'B' });
  const minor = chartTarget('take-the-a-train', { chord: 'Dm7', section: 'B' });
  assert.notEqual(dominant.node, minor.node);
  assert.notEqual(dominant.node, 'unmapped');
  assert.equal(chartTarget('solar', null), null);
});

import { shellVoicing, guitarTuning } from '../shellVoicing.js';

test('Shell voicings retain chart roots and contain exactly root, third and seventh', () => {
  for (const [chord, intervals] of [['Cmaj7', [0,4,11]], ['Cm7', [0,3,10]], ['C7b9', [0,4,10]], ['Cm7b5', [0,3,10]], ['Cdim7', [0,3,9]], ['CmMaj7', [0,3,11]]]) {
    for (const [string, fret] of [['E',8], ['A',3], ['D',10]]) {
      const shell = shellVoicing(chord, {string, fret});
      assert.equal(shell.notes.length, 3);
      assert.equal(shell.notes[0].fret, fret);
      const root = guitarTuning[shell.notes[0].string] + fret;
      assert.deepEqual(shell.notes.map(note => (guitarTuning[note.string] + note.fret - root) % 12).sort((a,b) => a-b), intervals);
      assert.ok(Math.max(...shell.notes.map(note => note.fret)) - Math.min(...shell.notes.map(note => note.fret)) <= 3);
    }
  }
});

test('Shell voicings handle substitutions, open roots and unavailable source positions', () => {
  assert.equal(shellVoicing('C6', {string:'A', fret:3}).substitution, true);
  assert.equal(shellVoicing('Em7', {string:'E', fret:0}).notes[0].fret, 0);
  assert.equal(shellVoicing('C7sus4', {string:'A', fret:3}), null);
  assert.equal(shellVoicing('C7', null), null);
  assert.equal(shellVoicing('NC', {string:'A', fret:3}), null);
  assert.equal(shellVoicing('C7', {string:'A', fret:4}), null);
});

import { chordQuality, chordQualityColor, chordDisplayColors } from '../data/chordQualityColors.js';
import { leadSheetSections } from '../data/leadSheet.js';
import { popupShouldMoveLeft, popupPlacement } from '../data/popupPlacement.js';

test('Popup checks both sides and moves vertically when the indicator overlaps both', () => {
  const popup = { width: 360, height: 300 };
  const obstacle = { left: 30, right: 410, top: 100, bottom: 160, width: 380, height: 60 };
  assert.deepEqual(popupPlacement(popup, 440, 800, [obstacle]), { side: 'right', top: 184 });
  const left = { side: 'left', top: 16 };
  const rightObstacle = { left: 900, right: 960, top: 100, bottom: 160, width: 60, height: 60 };
  assert.deepEqual(popupPlacement(popup, 1200, 800, [rightObstacle]), left);
  assert.deepEqual(popupPlacement(popup, 1200, 800, [rightObstacle], left), left);
  assert.deepEqual(popupPlacement(popup, 440, 800, [obstacle], left), { side: 'right', top: 184 });
});

test('Mini popup avoids indicators and next nodes using its preferred right footprint', () => {
  const popup = { width: 360, top: 16, bottom: 480 };
  const obstacle = (left, top, width = 60, height = 60) => ({ left, top, right: left + width, bottom: top + height, width, height });
  assert.equal(popupShouldMoveLeft(popup, 1200, [obstacle(950, 200)]), true);
  assert.equal(popupShouldMoveLeft(popup, 1200, [obstacle(950, 200)], true), true);
  assert.equal(popupShouldMoveLeft(popup, 1200, [obstacle(100, 200)], true), false);
  assert.equal(popupShouldMoveLeft(popup, 1200, [obstacle(950, 550)]), false);
  assert.equal(popupShouldMoveLeft(popup, 1200, [obstacle(950, 200, 0, 0)]), false);
  assert.equal(popupShouldMoveLeft(popup, 1200, [obstacle(745, 200)], true), true);
  assert.equal(popupShouldMoveLeft(popup, 1200, [obstacle(745, 200)]), false);
});

test('Mini lead sheet expands holds, preserves split bars, and resets repeat signs at sections', () => {
  const timeline = buildTimeline([
    { chord: 'Cm6', bars: 2, section: 'A' },
    { chord: 'Dm7', bars: .5, section: 'A' },
    { chord: 'G7b9', bars: .5, section: 'A' },
    { chord: 'Dm7', bars: .5, section: 'A' },
    { chord: 'G7b9', bars: .5, section: 'A' },
    { chord: 'G7b9', bars: 1, section: 'B · second pass' },
  ], 120);
  const sections = leadSheetSections(timeline);
  assert.equal(sections.length, 2);
  assert.deepEqual(sections[0].measures.map(bar => bar.repeat), [false, true, false, true]);
  assert.equal(sections[0].measures[1].parts[0].eventIndex, 0);
  assert.equal(sections[0].measures[1].parts[0].start, 2);
  assert.deepEqual(sections[0].measures[2].parts.map(part => [part.chord, part.bars, part.start, part.end]), [['Dm7', .5, 4, 5], ['G7b9', .5, 5, 6]]);
  assert.equal(sections[1].label, 'B · second pass');
  assert.equal(sections[1].measures[0].repeat, false);
  assert.equal(sections[1].measures[0].number, 5);
});

test('Quality colors preserve full source harmony and stay constant across roots and visits', () => {
  const examples = { C:'major', C6:'major', Cm:'minor', Cm6:'minor', Cmaj7:'major7', 'Cmaj7#11':'major7', Cm7:'minor7', Cm9:'minor7', 'C7b9':'dominant', 'C13#11':'dominant', Cdim7:'diminished', Cm7b5:'halfDiminished', C7sus4:'suspended', CmMaj7:'minorMajor7', 'Dbm7/Ab':'minor7' };
  for (const [chord, quality] of Object.entries(examples)) assert.equal(chordQuality(chord), quality, chord);
  assert.equal(chordQualityColor('Cm7'), chordQualityColor('F#m7'));
  const song = { nodeColorMode:'quality', playback:[{chord:'Cmaj7'}, {chord:'Cm7'}, {chord:'Cmaj7'}] };
  const colors = chordDisplayColors(song, ['red','green','blue']);
  assert.equal(colors[0], colors[2]);
  assert.notEqual(colors[0], colors[1]);
  assert.deepEqual(chordDisplayColors({...song, nodeColorMode:'rainbow'}, ['red','green','blue']), ['red','green','blue']);
});

test('Quality mode groups major and minor chords by family and retains a shared Other color', () => {
  for (const chord of ['Cm','Cm6','Cm7','Cm9','Cm11','Cm13','Cm7b5','Cø7','CmMaj7','CmΔ7','Dbm6/Ab']) assert.equal(chordQualityColor(chord),chordQualityColor('Cm7'),chord);
  assert.notEqual(chordQualityColor('C'), chordQualityColor('Cm'));
  for (const chord of ['C','C6','C6/9','Db6/Ab','Cmaj7','Csus2','Csus4','C7sus4']) assert.equal(chordQualityColor(chord),chordQualityColor('Cmaj7'),chord);
  assert.notEqual(chordQualityColor('Cdim7'), chordQualityColor('C'));
  const colors = ['Cmaj7','Cm7','C7','Cdim7'].map(chordQualityColor);
  assert.equal(new Set(colors).size,4);
});
