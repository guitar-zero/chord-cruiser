import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTab, demoTab, noteName, parseTuning } from './tabInput.js';
import { buildTabGraph } from './tabGraph.js';
import { nodeVisits, nodeVisitColors, nearbyPlaybackNodes, branchColors } from './graphPresentation.js';
import { routePath } from './stringLayout.js';
import { reciprocalRoutes } from './reciprocalRoutes.js';
import { routePalette } from './routePalette.js';
import { validateTabUrl } from './tabUrl.js';
import { extractTab, tabImportMiddleware } from '../../server/tabImport.js';
import { readTabImportResponse } from './tabImportResponse.js';

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

test('Tab import handles missing endpoints and validates server responses',async()=>{
  await assert.rejects(readTabImportResponse(new Response('<!doctype html>',{headers:{'Content-Type':'text/html'}})),/Restart the dev server/);
  await assert.rejects(readTabImportResponse(Response.json({error:'Source unavailable'},{status:422})),/Source unavailable/);
  await assert.rejects(readTabImportResponse(Response.json({title:'Missing text'})),/no tab text/);
  await assert.rejects(readTabImportResponse(new Response('{',{headers:{'Content-Type':'application/json'}})),/unreadable response/);
  assert.deepEqual(await readTabImportResponse(Response.json({text:demoTab,title:'Demo'})),{text:demoTab,title:'Demo'});
});

test('Tab parser preserves aligned chords, multi-digit frets, open and muted strings, and techniques',()=>{
  const parsed=parseTab('e|--10h12--0--|\nB|--10-----x--|\nG|------------|\nD|------------|\nA|------------|\nE|------------|');
  assert.equal(parsed.events.length,3);
  assert.deepEqual(parsed.events[0].notes.map(note=>note.fret),[10,10]);
  assert.equal(parsed.events[1].notes[0].technique,'h');
  assert.deepEqual(parsed.events[2].notes.map(note=>note.fret),[0,null]);
  assert.throws(()=>parseTab('Am D7 G'),/No six-string/);
});
test('Tab graph uses the shared chart schema with six strings and simultaneous-note playback',()=>{
  const parsed=parseTab(demoTab),song=buildTabGraph(parsed);
  assert.equal(song.playback.length,parsed.events.length);
  assert.equal(song.layout.sections.length,2);
  assert.equal(song.layout.sections[0].rows.length,6);
  assert.equal(song.playback[0].notes[0].midi,48);
  assert.equal(song.playback.at(-1).nodeIds.length,5);
  assert.ok(song.nodes.some(node=>node.fret===0));
  const visits=nodeVisits(song);
  const repeated=song.playback.at(-1).nodeIds[0];
  assert.ok(visits[repeated].length>1);
  const colors=nodeVisitColors(song,song.playback.map(()=> 'red'));
  assert.equal(colors[repeated],'red');
  const nearby=nearbyPlaybackNodes(song,song.playback.length-2);
  for(const nodeId of song.playback.at(-1).nodeIds) assert.ok(nearby.has(nodeId));
  assert.ok(song.edges.every(edge=>edge.source!==edge.target));
});
test('Tab graphs preserve clear routes, traversal-ordered branches, and spaced reciprocal lanes',()=>{
  const song=buildTabGraph(parseTab(demoTab));
  for(const section of song.layout.sections) {
    const local=song.nodes.filter(node=>node.section===section.id);
    const paths=Object.fromEntries(song.edges.filter(edge=>edge.section===section.id).map(edge=>[edge.id,routePath(local.find(node=>node.id===edge.source),local.find(node=>node.id===edge.target),local,section)||edge.path]));
    const colors=branchColors(song,section,routePalette);
    const spaced=reciprocalRoutes(song,section,routePalette,paths,colors);
    for(const edge of song.edges.filter(edge=>edge.section===section.id)) assert.ok(edge.source&&edge.target);
    assert.ok(spaced);
  }
});
test('Tuning and capo change pitches without changing tab frets or strings',()=>{
  assert.equal(noteName(48),'C3');
  const tuning=parseTuning('D2 A2 D3 G3 B3 E4');
  assert.equal(tuning[5],38);
  assert.throws(()=>parseTuning('E A D G B E'),/six tuning/);
  const parsed=parseTab(demoTab);
  const original=buildTabGraph(parsed),shifted=buildTabGraph(parsed,{tuning,capo:2});
  assert.equal(shifted.playback[0].notes[0].midi,original.playback[0].notes[0].midi+2);
  assert.equal(shifted.nodes[0].fret,original.nodes[0].fret);
});
test('URL importer extracts public text and rejects off-site links and redirects',async()=>{
  const url='https://tabs.ultimate-guitar.com/tab/led-zeppelin/stairway-to-heaven-tabs-9488';
  assert.equal(validateTabUrl(url).hostname,'tabs.ultimate-guitar.com');
  for(const value of ['http://tabs.ultimate-guitar.com/tab/test','https://example.com/tab/test','https://tabs.ultimate-guitar.com:444/tab/test','https://user@tabs.ultimate-guitar.com/tab/test']) assert.throws(()=>validateTabUrl(value));
  const data={store:{page:{data:{tab:{song_name:'Test'},tab_view:{wiki_tab:{content:demoTab}}}}}};
  const html=`<div class="js-store" data-content="${JSON.stringify(data).replaceAll('"','&quot;')}"></div>`;
  assert.equal(extractTab(html).text,demoTab);
  const originalFetch=globalThis.fetch;
  const response=()=>({statusCode:200,setHeader(){},end(body){this.data=JSON.parse(body);}});
  try {
    globalThis.fetch=async()=>new Response(html);
    const ok=response();await tabImportMiddleware({method:'GET',url:'/api/tab-import?url='+encodeURIComponent(url)},ok,()=>assert.fail());
    assert.equal(ok.data.title,'Test');
    globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:'https://example.com'}});
    const blocked=response();await tabImportMiddleware({method:'GET',url:'/api/tab-import?url='+encodeURIComponent(url)},blocked,()=>assert.fail());
    assert.equal(blocked.statusCode,422);
  } finally {globalThis.fetch=originalFetch;}
});

test('Every tab section shows the same open-to-12th-fret neck', () => {
  const song=buildTabGraph(parseTab(demoTab));
  const expected=Array.from({length:13},(_,i)=>i);
  for(const section of song.layout.sections) {
    assert.deepEqual(section.frets,expected);
    assert.equal(section.rows.length,6);
    assert.deepEqual(section.centers,song.layout.sections[0].centers);
  }
  for(const node of song.nodes) {
    const section=song.layout.sections.find(section=>section.id===node.section);
    assert.equal(node.x,section.centers[node.fret]);
    assert.equal(node.y,section.rows[node.stringIndex]);
  }
});

test('Higher tab notes retain their pitch and timing without extending the visible neck', () => {
  const parsed=parseTab('e|--15--3--|\nB|---------|\nG|---------|\nD|---------|\nA|---------|\nE|---------|');
  const song=buildTabGraph(parsed);
  assert.equal(song.playback.length,2);
  assert.equal(song.playback[0].notes[0].midi,79);
  assert.equal(song.playback[0].notes[0].fret,15);
  assert.equal(song.playback[0].notes[0].nodeId,null);
  assert.ok(song.nodes.every(node=>node.fret<=12));
});

test('Tab lookahead shows five steps while chord charts retain their three-step default', () => {
  const song=buildTabGraph(parseTab(demoTab));
  const firstFive=song.playback.slice(0,5).flatMap(event=>event.nodeIds);
  assert.deepEqual([...nearbyPlaybackNodes(song,0,5)].sort(),[...new Set(firstFive)].sort());
  const firstThree=song.playback.slice(0,3).flatMap(event=>event.nodeIds);
  assert.deepEqual([...nearbyPlaybackNodes(song,0)].sort(),[...new Set(firstThree)].sort());
});
