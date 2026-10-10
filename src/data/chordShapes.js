export function chordShape(chord) {
  const quality = chord.replace(/^[A-G][b#♭♯]?/, '');
  if (/dim|°|ø|m7b5/.test(quality)) return 'hexagon';
  if (/^m(?!aj)/.test(quality)) return 'triangle';
  if (/^7/.test(quality)) return 'square';
  return 'circle';
}

export function songNodeShapes(song) {
  return Object.fromEntries(song.nodes.map(node => {
    const source = song.playback.find(event => event.nodeId === node.id);
    return [node.id, chordShape(source?.chord || node.chord)];
  }));
}

// Shapes distinguish the first two chord nodes sharing a physical root anchor.
export function positionNodeShapes(song) {
  const seen=new Map(), shapes={};
  const firstVisit=new Map();
  song.playback.forEach((event,i)=>{if(!firstVisit.has(event.nodeId)) firstVisit.set(event.nodeId,i);});
  const ordered=[...song.nodes].sort((a,b)=>(firstVisit.get(a.id) ?? Infinity)-(firstVisit.get(b.id) ?? Infinity));
  for(const node of ordered) {
    const anchor=`${node.section}:${node.string}:${node.fret}`;
    const index=seen.get(anchor)||0;
    shapes[node.id]=index===1?'square':'circle';
    seen.set(anchor,index+1);
  }
  return shapes;
}
