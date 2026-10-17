import test from 'node:test';
import assert from 'node:assert/strict';
import { pointAlongRoute, routeSampler } from './motion.js';
import { routePath } from './stringLayout.js';
import { fullFretboardLayout } from './fullFretboardLayout.js';

test('Whole fretboard extends the slice while preserving chord and route alignment', () => {
  for (const rows of [[400, 760], [350, 620, 890]]) {
    const section = { id: 'main', left: 200, right: 1280, frets: [8, 9, 10], boundaries: [200, 560, 920, 1280], centers: [380, 740, 1100], rows, top: rows[0] - 65, bottom: rows.at(-1) + 65 };
    const song = { nodes: [{ id: 'chord', section: 'main', fret: 9, x: 740, y: rows.at(-1), radius: 46 }], edges: [{ section: 'main', path: 'M380 400 L740 760' }], playback: [{ nodeId: 'chord' }], layout: { sections: [section] } };
    const expanded = fullFretboardLayout(song);
    const board = expanded.layout.sections[0];
    assert.equal(board.frets[0], 1);
    assert.equal(board.frets.at(-1), 12);
    assert.equal(board.frets.length, 12);
    assert.equal(board.showHeadstock, true);
    assert.deepEqual(board.rows, rows);
    assert.equal(board.stringLabels, section.stringLabels);
    for (const [i, fret] of section.frets.entries()) assert.ok(Math.abs(board.centers[fret - 1] - (section.left + (section.centers[i] - section.left) * .8)) < 1e-9);
    assert.equal(expanded.nodes[0].x, board.centers[8]);
    assert.equal(expanded.nodes[0].radius, 46);
    assert.equal(expanded.nodes[0].y, song.nodes[0].y);
    assert.equal(expanded.edges[0].path, 'M344 400 L632 760');
    assert.ok(board.boundaries[1] - board.boundaries[0] < section.boundaries[1] - section.boundaries[0]);
    assert.equal(expanded.playback, song.playback);
    assert.equal(section.frets.length, 3);
    assert.ok(board.top < board.rows[0]);
  }
});

test('Dense six-string passages route around intervening notes without crashing',()=>{
  const positions=[[1,3],[2,0],[0,2],[1,1],[3,2],[4,3],[0,0],[3,0],[2,2]];
  const nodes=positions.map(([string,fret])=>({id:`s${string}f${fret}`,x:260+140*fret,y:350+220*string}));
  const source=nodes.find(n=>n.id==='s0f2'),target=nodes.find(n=>n.id==='s3f2');
  const path=routePath(source,target,nodes,{rows:Array.from({length:6},(_,i)=>350+220*i)});
  assert.ok(path);
  const points=[...path.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g)].map(([,x,y])=>({x:Number(x),y:Number(y)}));
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
    for(const node of nodes.filter(n=>n!==source&&n!==target)) {
      const t=Math.max(0,Math.min(1,((node.x-a.x)*dx+(node.y-a.y)*dy)/length));
      assert.ok(Math.hypot(node.x-a.x-dx*t,node.y-a.y-dy*t)>=70-1e-6);
    }
  }
});

test('Cached motion sampler preserves bends, distances, and interrupted route positions', () => {
  const route = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }];
  const sample = routeSampler(route);
  for (const progress of [-.5, 0, .25, .5, .75, 1, 1.5]) assert.deepEqual(sample(progress), pointAlongRoute(route, progress));
  assert.deepEqual(sample(.25), { x: 0, y: 50 });
  assert.deepEqual(sample(.75), { x: 50, y: 100 });
  assert.deepEqual(routeSampler([{ x: 20, y: 30 }])(.5), { x: 20, y: 30 });
});
