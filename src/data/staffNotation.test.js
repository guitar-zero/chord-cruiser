import test from 'node:test';
import assert from 'node:assert/strict';
import { staffChord, staffNotePositions } from './staffNotation.js';
import { songs } from './songs.js';
import { keyRoots, transposeSong } from './transpose.js';
import { staffScrollPercent, STAFF_PLAY_SLOT, STAFF_LEADING_EVENTS } from './staffMotion.js';

test('Staff motion moves left throughout a hold and stays continuous at chord boundaries', () => {
  for (const visible of [3, 5]) {
    const start = staffScrollPercent({ visitIndex: 2, progress: 0 }, 2, visible);
    const middle = staffScrollPercent({ visitIndex: 2, progress: .5 }, 2, visible);
    const end = staffScrollPercent({ visitIndex: 2, progress: 1 }, 2, visible);
    assert.ok(start > middle && middle > end);
    assert.equal(end, staffScrollPercent({ visitIndex: 3, progress: 0 }, 3, visible));
    assert.equal(start, staffScrollPercent({ visitIndex: 2, progress: .5 }, 2, visible, true));
  }
});

test('A chord reaches the play box on its onset and remains beyond the clef fade for its entire hold', () => {
  for (const visible of [3, 5]) {
    const index = 4;
    const centerInSlots = progress => index + STAFF_LEADING_EVENTS + .5
      + staffScrollPercent({ visitIndex: index, progress }, index, visible) * visible / 100;
    assert.equal(centerInSlots(0), STAFF_PLAY_SLOT);
    assert.equal(centerInSlots(1), STAFF_PLAY_SLOT - 1);
    // The fade ends at .55 slots; even the leftmost accidental stays clear.
    assert.ok(centerInSlots(1) - 90 / 280 > .55);
    assert.equal(centerInSlots(0) - 1, 1); // Previous chord still visible at onset.
  }
});

const spelling = chord => staffChord(chord).map(note => note.letter + note.accidental).sort();
test('Arpeggios begin with the colored root and follow chord-degree order within the staff', () => {
  for (const chord of ['Cmaj7', 'F7b9', 'D♭m7', 'G13#11', 'A7', 'C/F#']) {
    const notes = staffChord(chord);
    const arpeggio = staffNotePositions(notes);
    assert.deepEqual(arpeggio.map(({ x, accidentalX, ...note }) => note), notes);
    assert.equal(arpeggio[0].isRoot, true);
    assert.equal(arpeggio[0].x, 140); // First note reaches the timing box on onset.
    for (let i = 1; i < arpeggio.length; i++) {
      assert.ok(arpeggio[i].x > arpeggio[i - 1].x);
    }
    assert.ok(arpeggio.at(-1).x < 420); // Clear of the following chord's first note.
  }
  assert.deepEqual(staffChord('A7').map(note => note.letter + note.accidental), ['A', 'C♯', 'E', 'G']);
  assert.deepEqual(staffChord('G13#11').map(note => note.letter + note.accidental), ['G', 'B', 'D', 'F', 'A', 'C♯', 'E']);
});

test('Treble notation spells complete triads, sevenths, alterations, and slash tones', () => {
  assert.deepEqual(spelling('C'), ['C', 'E', 'G']);
  assert.deepEqual(spelling('Cm7'), ['B♭', 'C', 'E♭', 'G']);
  assert.deepEqual(spelling('Cmaj7'), ['B', 'C', 'E', 'G']);
  assert.deepEqual(spelling('Cdim7'), ['B𝄫', 'C', 'E♭', 'G♭']);
  assert.deepEqual(spelling('C7#9b5'), ['B♭', 'C', 'D♯', 'E', 'G♭']);
  assert.deepEqual(spelling('D♭m7'), ['A♭', 'C♭', 'D♭', 'F♭']);
  assert.deepEqual(spelling('C/F#'), ['C', 'E', 'F♯', 'G']);
  assert.deepEqual(staffChord('NC'), []);
});

test('Every song in every key keeps one colored root in A4–G5 and other notes inside the staff', () => {
  for (const song of songs) for (const key of keyRoots) {
    for (const event of transposeSong(song, key).playback) {
      const notes = staffChord(event.chord);
      if (event.chord === 'NC') continue;
      assert.ok(notes.length >= 3, event.chord);
      assert.equal(notes[0].isRoot, true, event.chord);
      const roots = notes.filter(note => note.isRoot);
      assert.equal(roots.length, 1, event.chord);
      assert.ok(roots[0].step >= 33 && roots[0].step <= 39, event.chord);
      for (const note of notes.filter(note => !note.isRoot)) {
        assert.ok(note.step >= 30 && note.step <= 38, `${event.chord}: ${note.letter}`);
      }
    }
  }
});
