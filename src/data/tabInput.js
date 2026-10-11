export const tabStringNames = ['High E', 'B', 'G', 'D', 'A', 'Low E'];
export const standardTuning = [64, 59, 55, 50, 45, 40];
export const demoTab = `Original practice phrase
 e|----------------0--3--0--------|
 B|----------1--3-----------3--1--|
 G|-------0----------------------|
 D|----2-------------------------|
 A|-3----------------------------|
 E|------------------------------|

 e|--0-----0-----0-----0--|
 B|--1-----1-----1-----1--|
 G|--0-----2-----0-----0--|
 D|--2-----2-----0-----2--|
 A|--3-----0-----2-----3--|
 E|--------------3--------|`;

export function parseTab(text) {
  const lines = text.replace(/\r/g, '').replace(/\[\/?(?:tab|ch)\]/g, '').split('\n');
  const blocks = [], warnings = new Set();
  let rows = [];
  for (const line of lines) {
    const match = line.match(/^\s*([eEbBgGdDaA](?:[#b])?)?\s*[|:]([\d\sxX|:()<>~hpbr/\\.\-]+)\s*$/);
    if (!match) { if (rows.length && rows.length !== 6) warnings.add('An incomplete staff was skipped; use six string rows.'); rows = []; continue; }
    rows.push({ label:match[1], body:match[2] });
    if (rows.length === 6) { blocks.push(rows); rows = []; }
  }
  if(rows.length) warnings.add('An incomplete staff was skipped; use six string rows.');
  const events=[];
  blocks.forEach((block,blockIndex)=>{
    const columns=new Map();
    block.forEach((row,string)=>{
      for(const match of row.body.matchAll(/\d+|[xX]/g)) {
        const fret=/x/i.test(match[0]) ? null : Number(match[0]);
        if(fret!==null && fret>24) {warnings.add('Frets above 24 were skipped.');continue;}
        const technique=row.body.slice(Math.max(0,match.index-1),match.index).match(/[hpbr/\\<(]/)?.[0] || row.body.slice(match.index+match[0].length).match(/^[~hpbr/\\>)]/)?.[0] || '';
        if(!columns.has(match.index)) columns.set(match.index,[]);
        columns.get(match.index).push({string,fret,technique});
      }
    });
    [...columns.entries()].sort((a,b)=>a[0]-b[0]).forEach(([column,notes])=>events.push({index:events.length,blockIndex,column,notes}));
    if(block.some(row=>/:/.test(row.body))) warnings.add('Repeat signs are not expanded; repeat the passage manually.');
  });
  if(!events.length) throw Error('No six-string guitar tab found. Paste six aligned string rows, high E first and low E last.');
  warnings.add('Practice timing: one step per note column. Original rhythm is not inferred.');
  if(events.some(event=>event.notes.some(note=>note.technique))) warnings.add('Technique marks are preserved; sound plays the written fret without bend or slide effects.');
  return {events,blocks,warnings:[...warnings]};
}

export function noteName(midi) {
  return ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][midi%12] + (Math.floor(midi/12)-1);
}

export function parseTuning(text) {
  const pitches={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const notes=text.trim().split(/\s+/).map(part=>{
    const match=part.match(/^([A-G])([#b]?)([1-5])$/);
    return match ? (Number(match[3])+1)*12+pitches[match[1]]+(match[2]==='#'?1:match[2]==='b'?-1:0) : NaN;
  });
  if(notes.length!==6 || notes.some(note=>!Number.isFinite(note))) throw Error('Use six tuning notes, low to high: E2 A2 D3 G3 B3 E4.');
  return notes.reverse();
}
