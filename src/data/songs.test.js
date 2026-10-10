import test from 'node:test';
import assert from 'node:assert/strict';
import { songs, songsById } from './songs.js';
import { chartTarget } from '../audio/chartTarget.js';
import { nodeVisitColors, upcomingMovement, rapidPassage, rapidPassageMovements, quickChangeRanges, nearbyPlaybackNodes } from './graphPresentation.js';
import { sectionScrollDelta } from './sectionScroll.js';
import catalogue from '../../scripts/data/catalogue-index.json' with { type: 'json' };

test('Section scrolling shows both charts when possible and aligns upward destinations at the top', () => {
  assert.equal(sectionScrollDelta({ top: 20, bottom: 300 }, { top: 320, bottom: 600 }, 800), 0);
  assert.equal(sectionScrollDelta({ top: 300, bottom: 600 }, { top: 620, bottom: 920 }, 800), 300);
  assert.equal(sectionScrollDelta({ top: 500, bottom: 900 }, { top: 20, bottom: 480 }, 800), 20);
  assert.equal(sectionScrollDelta({ top: -100, bottom: 300 }, { top: -600, bottom: -120 }, 800), -600);
  assert.equal(sectionScrollDelta({ top: 100, bottom: 700 }, { top: 720, bottom: 1320 }, 800), 520);
  assert.equal(sectionScrollDelta({ top: 100, bottom: 700 }, { top: 720, bottom: 1720 }, 800), 720);
});

test('Upcoming movement chooses the playback branch without inventing end loops or skipping omitted chords', () => {
  const song = { playback: [{ nodeId: 'a' }, { nodeId: 'c' }, { nodeId: null }, { nodeId: 'b' }], edges: [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ac', source: 'a', target: 'c' }] };
  assert.deepEqual(upcomingMovement(song, 0), { nodeId: 'c', edgeId: 'ac', visitIndex: 1 });
  assert.equal(upcomingMovement(song, 1), null);
  assert.equal(upcomingMovement(song, 3), null);
  assert.equal(upcomingMovement(song, undefined), null);
});

test('Rapid turnaround highlights every route throughout its split-bar passage and clears afterward', () => {
  const song = songsById['all-of-me'];
  const first = song.playback.length - 4;
  for (let index = first; index < song.playback.length; index++) {
    assert.deepEqual(rapidPassage(song, index), { start: first, end: song.playback.length - 1 });
    const movements = rapidPassageMovements(song, index);
    assert.equal(movements.length, 3);
    assert.deepEqual(movements.map(move => move.sourceVisitIndex), [first, first + 1, first + 2]);
    assert.ok(movements.every(move => song.edges.some(edge => edge.id === move.edgeId)));
  }
  assert.deepEqual(rapidPassage(song, first - 1), { start: first, end: song.playback.length - 1 });
  assert.equal(rapidPassage(song, first - 2), null);
  assert.deepEqual(rapidPassageMovements(song, 0), []);
  assert.equal(rapidPassage({ playback: [{ bars: .5 }, { bars: 1 }] }, 0), null);
  assert.equal(rapidPassage(song, undefined), null);
  const middle = { playback: [{ nodeId: 'a', bars: 1 }, { nodeId: 'b', bars: .5 }, { nodeId: 'c', bars: .25 }, { nodeId: 'd', bars: 1 }], edges: [{ id: 'bc', source: 'b', target: 'c' }, { id: 'cd', source: 'c', target: 'd' }] };
  assert.deepEqual(rapidPassage(middle, 0), { start: 1, end: 2 });
  assert.deepEqual(rapidPassageMovements(middle, 0).map(move => move.edgeId), ['bc', 'cd']);
  assert.equal(rapidPassage(middle, 3), null);
  assert.deepEqual(quickChangeRanges(middle.playback), [{ start: 1, end: 2 }]);
  assert.deepEqual(quickChangeRanges([{ bars: .5 }, { bars: 1 }, { bars: .5 }, { bars: .5 }]), [{ start: 2, end: 3 }]);
});

test('Node colors match first timeline appearances and update on revisits and seeks', () => {
  const song = { playback: [{ nodeId: 'a' }, { nodeId: null }, { nodeId: 'b' }, { nodeId: 'a' }] };
  const colors = ['red', 'orange', 'green', 'blue'];
  assert.deepEqual(nodeVisitColors(song, colors), { a: 'red', b: 'green' });
  assert.deepEqual(nodeVisitColors(song, colors, 2), { a: 'red', b: 'green' });
  assert.deepEqual(nodeVisitColors(song, colors, 3), { a: 'blue', b: 'green' });
  assert.deepEqual(nodeVisitColors(song, colors, 0), { a: 'red', b: 'green' });
});

test('Focused nodes follow current/next/then and retain complete active quick-change chains', () => {
  const song = { playback: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((nodeId, index) => ({ nodeId, bars: index >= 2 && index <= 5 ? .5 : 1 })) };
  assert.deepEqual([...nearbyPlaybackNodes(song, 1)].sort(), ['b', 'c', 'd']);
  assert.deepEqual([...nearbyPlaybackNodes(song, 4)].sort(), ['c', 'd', 'e', 'f', 'g']);
  assert.deepEqual([...nearbyPlaybackNodes(song, 7)].sort(), ['a', 'b', 'h']);
  assert.deepEqual([...nearbyPlaybackNodes(song)].sort(), ['a', 'b', 'c']);
});

test('Section rendering crops both legacy side-by-side and stacked layouts without clipping roots or route bends', async () => {
  const { sectionViewport } = await import('./sectionViewport.js');
  const { routeVertices } = await import('./reciprocalRoutes.js');
  for (const song of songs) for (const section of song.layout.sections) {
    const [x,y,width,height] = sectionViewport(song,section.id).split(' ').map(Number);
    assert.ok([x,y,width,height].every(Number.isFinite));
    assert.ok(width>0 && height>0);
    for (const node of song.nodes.filter(node => node.section===section.id)) {
      assert.ok(node.x-50>=x && node.x+50<=x+width,`${song.id}: ${node.id}`);
      assert.ok(node.y-100>=y && node.y+100<=y+height,`${song.id}: ${node.id}`);
    }
    for (const edge of song.edges.filter(edge => edge.section===section.id && edge.path)) {
      for (const point of routeVertices(edge.path)) assert.ok(point.x>x && point.x<x+width && point.y>y && point.y<y+height,song.id);
    }
  }
  const allOfMe = songsById['all-of-me'];
  const first=sectionViewport(allOfMe,'ab').split(' ').map(Number);
  const second=sectionViewport(allOfMe,'ac').split(' ').map(Number);
  assert.equal(first[2],second[2]);
  assert.equal(first[3],second[3]);
  assert.notEqual(first[0],second[0]);
});

test('Complete repertoire has 201 songs with playable qualities and meter-aware timing', async () => {
  const { buildTimeline, chordNotes, bassNote } = await import('../audio/songs.js');
  assert.equal(songs.length, 201);
  assert.deepEqual(songs.map(song => song.id), catalogue.map(song => song.id));
  assert.equal(new Set(songs.map(song => song.id)).size, 201);
  for (const song of songs) {
    const meter = song.beatsPerBar || 4;
    const timeline = buildTimeline(song.playback, 120, meter);
    const bars = song.playback.reduce((sum, event) => sum + event.bars, 0);
    assert.ok(Math.abs(timeline.beats - bars * meter) < 1e-8, song.id);
    assert.ok(Math.abs(timeline.events.at(-1).start + timeline.events.at(-1).duration - timeline.duration) < 1e-8, song.id);
    for (const event of song.playback) {
      const notes = chordNotes(event.chord);
      assert.ok(notes.every(Number.isFinite), `${song.id}: ${event.chord}`);
      assert.ok(event.chord === 'NC' ? notes.length === 0 && bassNote(event.chord) === null : notes.length >= 3 && Number.isFinite(bassNote(event.chord)), song.id);
    }
  }
  assert.equal(songsById['take-five'].beatsPerBar, 5);
  assert.deepEqual(songsById['take-five'].playback.slice(0,2).map(event => event.bars), [.6,.4]);
});

test('Song graphs have valid references, unique steps, and positive playback durations', () => {
  for (const song of songs) {
    assert.equal(song.schemaVersion, 1);
    const ids = new Set(song.nodes.map(node => node.id));
    assert.equal(ids.size, song.nodes.length);
    assert.ok(ids.has(song.startNodeId));
    assert.deepEqual(song.nodes.map(node => node.step).sort((a,b) => a-b), song.nodes.map((_,i) => i+1));
    const sections = new Set(song.layout.sections.map(section => section.id));
    for (const node of song.nodes) {
      assert.ok(sections.has(node.section));
      assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y));
    }
    for (const edge of song.edges) {
      assert.ok(ids.has(edge.source));
      assert.ok(edge.target === null || ids.has(edge.target));
      assert.ok(sections.has(edge.section));
    }
    for (const event of song.playback) {
      assert.ok(event.bars > 0);
      assert.ok(event.nodeId === null || ids.has(event.nodeId));
      assert.equal(chartTarget(song.id, event).node, event.nodeId || 'unmapped');
    }
    for (const route of song.routes) for (const id of route.nodeIds) assert.ok(ids.has(id));
    for (const label of song.durationLabels) assert.ok(ids.has(label.nodeId));
  }
});

test('Different D qualities share the same fret and string in each A Train section', () => {
  const song = songsById['take-the-a-train'];
  for (const section of song.layout.sections.map(section => section.id)) {
    const dominant = song.nodes.find(node => node.section === section && /^D7/.test(node.chord));
    const minor = song.nodes.find(node => node.section === section && node.chord === 'Dm');
    assert.equal(dominant.fret, minor.fret);
    assert.equal(dominant.string, minor.string);
    assert.equal(dominant.y, minor.y);
    assert.notEqual(dominant.x, minor.x);
  }
});

test('All Of Me preserves ABAC holds and the two split turnaround bars', async () => {
  const { buildTimeline, chordNotes, bassNote } = await import('../audio/songs.js');
  const song = songsById['all-of-me'];
  const timeline = buildTimeline(song.playback, 120);
  assert.equal(timeline.beats, 128);
  assert.equal(timeline.duration, 64);
  assert.deepEqual(song.playback.slice(-4).map(event => [event.chord, event.bars]), [
    ['C6', 0.5], ['Ebdim7', 0.5], ['Dm7', 0.5], ['G7', 0.5],
  ]);
  assert.equal(timeline.events.find(event => event.section === 'B').startBeat, 32);
  assert.equal(timeline.events.find(event => event.section === 'A · second pass').startBeat, 64);
  assert.equal(timeline.events.find(event => event.section === 'C').startBeat, 96);
  for (const event of song.playback) {
    assert.equal(chordNotes(event.chord).length, 4);
    assert.equal(bassNote(event.chord), chordNotes(event.chord)[0] - 7);
  }
  assert.deepEqual(chordNotes('Ebdim7'), [51, 60, 66, 69]);
});

test('Visit badges include returns, and branching colors prioritize first traversal', async () => {
  const { nodeVisits, branchColors } = await import('./graphPresentation.js');
  const song = songsById['all-of-me'];
  const visits = nodeVisits(song);
  assert.deepEqual(visits['ab-e7'], [2, 5]);
  assert.deepEqual(visits['ab-dm'], [4, 8]);
  assert.deepEqual(visits['ac-dm'], [13, 18, 22]);
  const section = song.layout.sections[0];
  const colors = branchColors(song, section, ['#cc480e', '#267b99', '#8b4695']);
  const first = song.edges.find(edge => edge.source === 'ab-e7' && edge.target === 'ab-a7');
  const later = song.edges.find(edge => edge.source === 'ab-e7' && edge.target === 'ab-am');
  assert.equal(colors[first.id], '#cc480e');
  assert.equal(colors[later.id], '#267b99');
  assert.equal(nodeVisits(songsById.solar).cm.length, 1);
});

test('Highlight motion follows bends by distance instead of cutting diagonally', async () => {
  const { pointAlongRoute } = await import('./motion.js');
  const route = [{ x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }];
  assert.deepEqual(pointAlongRoute(route, 0.25), { x: 0, y: 50 });
  assert.deepEqual(pointAlongRoute(route, 0.5), { x: 0, y: 100 });
  assert.deepEqual(pointAlongRoute(route, 0.75), { x: 50, y: 100 });
  const edge = songsById['all-of-me'].edges.find(edge => edge.source === 'ab-d7' && edge.target === 'ab-dm');
  assert.equal(edge.path, undefined);
});

test('Chord shape uses source quality rather than simplified display labels', async () => {
  const { chordShape, songNodeShapes } = await import('./chordShapes.js');
  for (const chord of ['Cmaj7', 'F6']) assert.equal(chordShape(chord), 'circle');
  for (const chord of ['Dm7', 'Fm6', 'CmMaj7']) assert.equal(chordShape(chord), 'triangle');
  for (const chord of ['E7', 'G7b9', 'D7b13']) assert.equal(chordShape(chord), 'square');
  for (const chord of ['Dm7b5', 'Ebdim7']) assert.equal(chordShape(chord), 'hexagon');
  const solar = songNodeShapes(songsById.solar);
  assert.equal(solar.f, 'circle');
  assert.equal(solar.ddim, 'hexagon');
  assert.equal(solar.cm, 'triangle');
});

test('First ten source charts preserve form lengths, meter, and playable chord qualities', async () => {
  const { buildTimeline, chordNotes } = await import('../audio/songs.js');
  const expected = [
    ['a-foggy-day',34,4], ['afro-blue',16,3], ['afternoon-in-paris',32,4],
    ['airegin',36,4], ['all-blues',24,3], ['all-of-me',32,4],
    ['all-of-you',32,4], ['all-the-things-you-are',36,4],
    ['alone-together',44,4], ['along-came-betty',34,4],
  ];
  assert.deepEqual(songs.slice(0,10).map(song => song.id), expected.map(item => item[0]));
  for (const [id,bars,meter] of expected) {
    const song = songsById[id];
    const timeline = buildTimeline(song.playback,120,song.beatsPerBar || 4);
    assert.equal(timeline.beats,bars*meter,id);
    assert.equal(timeline.duration,bars*meter/2,id);
    assert.equal(timeline.events.at(-1).start+timeline.events.at(-1).duration,timeline.duration,id);
    for (const event of timeline.events) assert.ok(chordNotes(event.chord).every(Number.isFinite));
  }
  assert.deepEqual(chordNotes('C7/G'),[43,58,64,67]);
  assert.deepEqual(chordNotes('C7#9b5'),[48,58,64,66,75]);
  assert.equal(songsById['all-blues'].playback[0].bars,8);
  const paris = songsById['afternoon-in-paris'];
  assert.equal(paris.playback.filter(event => event.section === 'A · second ending').at(-1).bars,2);
  assert.ok(songsById['along-came-betty'].sourceNote.includes('50'));
});

test('Reciprocal arrows use spaced parallel lanes and opposite endpoint directions', async () => {
  const { offsetRoute, routeVertices, reciprocalRoutes } = await import('./reciprocalRoutes.js');
  assert.deepEqual(routeVertices(offsetRoute('M0 0 L100 0',14)), [{x:0,y:14},{x:100,y:14}]);
  assert.deepEqual(routeVertices(offsetRoute('M0 0 L100 0',-14,true)), [{x:100,y:-14},{x:0,y:-14}]);
  assert.deepEqual(routeVertices(offsetRoute('M0 0 V100 H100',14)), [{x:-14,y:0},{x:-14,y:114},{x:100,y:114}]);
  const song = { playback:[{nodeId:'a'},{nodeId:'b'},{nodeId:'a'}],edges:[
    {id:'return',section:'s',source:'b',target:'a'},
    {id:'out',section:'s',source:'a',target:'b'},
  ]};
  const result=reciprocalRoutes(song,{id:'s',color:'#cc480e'},['#cc480e','#267b99'],{out:'M0 0 L100 0',return:'M100 0 L0 0'},{});
  assert.equal(result.out.color,'#cc480e');
  assert.equal(result.return.color,'#267b99');
  assert.ok(routeVertices(result.out.path).at(-1).x > routeVertices(result.out.path)[0].x);
  assert.ok(routeVertices(result.return.path).at(-1).x < routeVertices(result.return.path)[0].x);
});

test('Canonical Autumn Leaves and A Train preserve source keys, alterations, repeats, and endings', async () => {
  const { buildTimeline } = await import('../audio/songs.js');
  const autumn = songsById['autumn-leaves'];
  assert.equal(autumn.key, 'G minor');
  assert.deepEqual(autumn.playback.slice(0,7).map(event => [event.chord,event.bars]), [
    ['Cm7',1], ['F7',1], ['Bbmaj7',1], ['Ebmaj7',1], ['Am7b5',1], ['D7b13',1], ['Gm6',2],
  ]);
  assert.deepEqual(autumn.playback.slice(7,14).map(event => event.chord), autumn.playback.slice(0,7).map(event => event.chord));
  assert.deepEqual(autumn.playback.filter(event => event.section === 'C').slice(2,6).map(event => [event.chord,event.bars]), [
    ['Gm7',.5], ['Gb7',.5], ['Fm7',.5], ['E7',.5],
  ]);
  const train = songsById['take-the-a-train'];
  assert.equal(train.key, 'C');
  assert.equal(train.playback.filter(event => event.chord === 'D7#11').length, 3);
  const bridge = train.playback.filter(event => event.section === 'B');
  assert.deepEqual(bridge.map(event => [event.chord,event.bars]), [['Fmaj7',4],['D7',2],['Dm7',1],['G7',.5],['G7b9',.5]]);
  assert.equal(buildTimeline(train.playback,120).events.find(event => event.chord === 'G7b9').start,47);
});

test('Transposition updates chord roots, slash basses, sound, and fret anchors without changing graph routes or timing', async () => {
  const { transposeSong, transposeChord, notePitch, keyRoots, minorKeyRoots } = await import('./transpose.js');
  const { chordNotes } = await import('../audio/songs.js');
  assert.equal(transposeChord('Bb7b9/F',2),'C7b9/G');
  assert.equal(transposeChord('NC',2),'NC');
  assert.equal(transposeChord('CmMaj7',2),'DmMaj7');
  assert.equal(transposeSong(songsById['autumn-leaves'],'F#').key,'F♯ minor');
  const source = songsById['autumn-leaves'];
  const moved = transposeSong(source,'A');
  assert.equal(moved.key,'A minor');
  assert.equal(moved.playback[0].chord,'Dm7');
  assert.deepEqual(chordNotes(moved.playback[0].chord),[50,60,65,69]);
  assert.deepEqual(moved.edges,source.edges);
  assert.deepEqual(moved.nodes.map(node=>[node.x,node.y,node.id]),source.nodes.map(node=>[node.x,node.y,node.id]));
  assert.deepEqual(moved.playback.map(event=>[event.bars,event.nodeId]),source.playback.map(event=>[event.bars,event.nodeId]));
  assert.equal(moved.nodes[0].fret,source.nodes[0].fret+2);
  assert.equal(source.playback[0].chord,'Cm7'); // Original JSON remains immutable.
  for (const song of songs) for (const key of /minor|-$/.test(song.key) ? minorKeyRoots : keyRoots) {
    const transposed = transposeSong(song,key);
    assert.equal(notePitch(transposed.key),notePitch(key));
    assert.ok(transposed.layout.sections.every(section=>section.frets.every(fret=>fret>=1 && fret<=24)));
    for (const event of transposed.playback) assert.ok(chordNotes(event.chord).every(Number.isFinite),song.id);
    for (let i=0;i<song.nodes.length;i++) {
      const before = song.nodes[i], after = transposed.nodes[i];
      assert.equal((notePitch(after.root)-notePitch(before.root)+12)%12,(after.fret-before.fret+12)%12);
      assert.equal(after.string,before.string);
    }
  }
});

 test('Two-string maps preserve playback and map every root accurately in every key', async () => {
  const { twoStringLayout } = await import('./stringLayout.js');
  const { transposeSong, keyRoots, notePitch } = await import('./transpose.js');
  for (const original of songs) {
    const snapshot=JSON.stringify(original);
    for (const key of keyRoots) {
      const source=transposeSong(original,key);
      const mapped=twoStringLayout(source);
      assert.deepEqual(mapped.playback,source.playback);
      assert.deepEqual(mapped.nodes.map(node=>node.id),source.nodes.map(node=>node.id));
      assert.equal(mapped.edges.length,source.edges.length);
      for (const section of mapped.layout.sections) {
        assert.equal(section.rows.length,2);
        assert.ok(section.frets.length>=7);
        const anchors=new Map();
        for (const node of mapped.nodes.filter(node=>node.section===section.id)) {
          assert.ok(['E','A'].includes(node.string));
          assert.ok(section.frets.includes(node.fret));
          assert.equal((node.fret+(node.string==='E'?4:9))%12,notePitch(node.root));
          assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y));
          const pitch=notePitch(node.root), anchor=[node.string,node.fret,node.y];
          if(anchors.has(pitch)) assert.deepEqual(anchor,anchors.get(pitch));
          anchors.set(pitch,anchor);
        }
      }
    }
    assert.equal(JSON.stringify(original),snapshot);
  }
});

test('All Of Me chooses nearby A roots instead of jumping to fret twelve', async () => {
  const { twoStringLayout } = await import('./stringLayout.js');
  const mapped=twoStringLayout(songsById['all-of-me']);
  const a=mapped.nodes.filter(node=>node.section===mapped.layout.sections[0].id && node.root==='A');
  assert.ok(a.length>=2);
  for(const node of a) { assert.equal(node.string,'E'); assert.equal(node.fret,5); }
});

test('Unrelated overlapping route segments receive parallel lanes with different colors', async () => {
  const { reciprocalRoutes, parallelOverlap } = await import('./reciprocalRoutes.js');
  const song={edges:[{id:'a',section:'s',source:'one',target:'two'},{id:'b',section:'s',source:'three',target:'four'},{id:'c',section:'s',source:'five',target:'six'}],playback:[]};
  const paths={a:'M0 0 L300 0',b:'M50 100 L50 0 L250 0 L250 100',c:'M80 0 L280 0'};
  const result=reciprocalRoutes(song,{id:'s'},['#cc480e','#267b99','#8b4695'],paths,{});
  const resolved=song.edges.map(edge=>({path:result[edge.id]?.path||paths[edge.id],color:result[edge.id]?.color||'#cc480e'}));
  for(let i=0;i<resolved.length;i++) for(let j=i+1;j<resolved.length;j++) {
    assert.equal(parallelOverlap(resolved[i].path,resolved[j].path),false);
    assert.notEqual(resolved[i].color,resolved[j].color);
  }
});

test('Color changes advance through the rainbow from the current color and wrap', async () => {
  const { routePalette, rainbowChoices }=await import('./routePalette.js');
  assert.deepEqual(rainbowChoices('#cc480e').slice(0,4),['#cc480e','#a06a16','#576b24','#29805d']);
  assert.deepEqual(rainbowChoices('#8b4695').slice(0,3),['#8b4695','#be3d6a','#c43b32']);
  assert.deepEqual(rainbowChoices('#a06a16',['#cc480e','#267b99','#8b4695']),['#267b99','#8b4695','#cc480e']);
  assert.equal(routePalette[0],'#c43b32');
  assert.equal(new Set(routePalette).size,routePalette.length);
});

test('Chronological color changes never reuse a color before completing the rainbow', async () => {
  const { chronologicalColors, routePalette }=await import('./routePalette.js');
  const source=['red','red','orange','red','cyan','red','orange','cyan','red','orange','red'];
  const colors=chronologicalColors(source);
  assert.equal(colors[0],colors[1]);
  const changes=colors.filter((color,i)=>i===0 || color!==colors[i-1]);
  assert.deepEqual(changes.slice(0,routePalette.length),routePalette);
  assert.equal(changes[routePalette.length],routePalette[0]);
});

test('Section headings stay above badges and fret labels stay below the board', async () => {
  const { sectionHeaderPositions, sectionViewport }=await import('./sectionViewport.js');
  for(const song of songs) for(const section of song.layout.sections) {
    const header=sectionHeaderPositions(song,section.id);
    assert.ok(header.titleY<=section.top-95);
    assert.ok(header.fretY>=section.bottom+90);
    for(const node of song.nodes.filter(node=>node.section===section.id)) assert.ok(header.titleY<=node.y+(node.badgeOffset ?? -68)-80);
    assert.ok(Number(sectionViewport(song,section.id).split(' ')[1])<=header.titleY-65);
  }
});

test('Three-string maps widen fret spacing while preserving roots, string rows, and playback', async () => {
  const { threeStringLayout }=await import('./threeStringLayout.js');
  for(const source of songs) {
    const mapped=threeStringLayout(source);
    assert.deepEqual(mapped.playback,source.playback);
    for(const [i,node] of mapped.nodes.entries()) {
      assert.equal(node.y,source.nodes[i].y);
      assert.equal(node.fret,source.nodes[i].fret);
      assert.equal(node.string,source.nodes[i].string);
    }
    for(const [i,section] of mapped.layout.sections.entries()) {
      assert.ok(Math.abs((section.right-section.left)/(source.layout.sections[i].right-source.layout.sections[i].left)-1.65)<1e-9);
      assert.equal(section.sideGutterRight,45);
    }
  }
});

test('Second node on the same fret and string is square, ordered by first playback visit', async () => {
  const { positionNodeShapes }=await import('./chordShapes.js');
  const song={nodes:[{id:'minor',section:'a',string:'E',fret:10},{id:'dominant',section:'a',string:'E',fret:10},{id:'other',section:'b',string:'E',fret:10},{id:'differentString',section:'a',string:'A',fret:10}],playback:[{nodeId:'dominant'},{nodeId:'minor'},{nodeId:'dominant'}]};
  assert.deepEqual(positionNodeShapes(song),{dominant:'circle',minor:'square',other:'circle',differentString:'circle'});
});

test('Experimental vertical stacking preserves fret anchors and playback across both string modes', async () => {
  const { stackSharedNodes }=await import('./stackSharedNodes.js');
  const { twoStringLayout }=await import('./stringLayout.js');
  const { threeStringLayout }=await import('./threeStringLayout.js');
  for(const source of songs) for(const layout of [twoStringLayout,threeStringLayout]) {
    const original=layout(source), snapshot=JSON.stringify(original);
    const mapped=stackSharedNodes(original);
    assert.deepEqual(mapped.playback,original.playback);
    const groups=Object.groupBy(mapped.nodes,node=>`${node.section}:${node.string}:${node.fret}`);
    for(const group of Object.values(groups)) if(group.length>1) {
      assert.ok(group.every(node=>node.x===group[0].x));
      assert.equal(new Set(group.map(node=>node.y)).size,group.length);
    }
    assert.equal(JSON.stringify(original),snapshot);
  }
});
