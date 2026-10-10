import { notePitch } from './transpose.js';

const tunings = { E: 4, A: 9 };
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);

export function routePath(source, target, nodes, section, orthogonal = false) {
  const clip = (node, point) => {
    const length=distance(node,point);
    return {x:node.x+(point.x-node.x)/length*55,y:node.y+(point.y-node.y)/length*55};
  };
  const clear = points => points.slice(1).every((end,i) => {
    const start=points[i], dx=end.x-start.x, dy=end.y-start.y, length=dx*dx+dy*dy;
    return nodes.every(node => {
      if (node.id===source.id || node.id===target.id) return true;
      const t=length ? Math.max(0,Math.min(1,((node.x-start.x)*dx+(node.y-start.y)*dy)/length)) : 0;
      return Math.hypot(node.x-start.x-dx*t,node.y-start.y-dy*t)>=70;
    });
  });
  const direct=[clip(source,target),clip(target,source)];
  if ((!orthogonal || source.x===target.x || source.y===target.y) && clear(direct)) return undefined;
  const candidates=[];
  for (const y of [...section.rows.flatMap(row=>[row-140,row+140]),(section.rows[0]+section.rows[1])/2]) {
    const first={x:source.x,y},last={x:target.x,y};
    if (!distance(source,first) || !distance(target,last)) continue;
    const points=[clip(source,first),first,last,clip(target,last)].filter((point,i,array)=>i===0 || distance(point,array[i-1])>0);
    if (clear(points)) candidates.push(points);
  }
  for(const x of [source.x-140,source.x+140,target.x-140,target.x+140]) {
    const first={x,y:source.y},last={x,y:target.y};
    if(!distance(source,first) || !distance(target,last)) continue;
    const points=[clip(source,first),first,last,clip(target,last)].filter((point,i,array)=>i===0 || distance(point,array[i-1])>0);
    if(clear(points)) candidates.push(points);
  }
  if(!candidates.length) {
    const rails=[Math.min(...nodes.map(node=>node.y))-140,Math.max(...nodes.map(node=>node.y))+140,...nodes.flatMap(node=>[node.y-100,node.y+100])];
    for(const sx of [source.x-100,source.x+100]) for(const tx of [target.x-100,target.x+100]) for(const y of rails) {
      const first={x:sx,y:source.y},last={x:tx,y:target.y};
      const points=[clip(source,first),first,{x:sx,y},{x:tx,y},last,clip(target,last)].filter((p,i,array)=>i===0 || distance(p,array[i-1])>0);
      if(clear(points)) candidates.push(points);
    }
  }
  if (!candidates.length) throw Error(`No clear two-string route: ${source.id} → ${target.id}`);
  candidates.sort((a,b)=>a.slice(1).reduce((sum,p,i)=>sum+distance(p,a[i]),0)-b.slice(1).reduce((sum,p,i)=>sum+distance(p,b[i]),0));
  return candidates[0].map((point,i)=>`${i?'L':'M'}${point.x} ${point.y}`).join(' ');
}

// Presentation only: source qualities, event durations, and node IDs are unchanged.
export function twoStringLayout(source) {
  const nodes=[], sections=[], edges=[];
  const pitchWidth=360, left=200;
  let chartRight=0;
  for (const [index, original] of source.layout.sections.entries()) {
    const originalNodes=source.nodes.filter(node=>node.section===original.id);
    const groups=Object.groupBy(originalNodes,node=>notePitch(node.root));
    const byOriginalId=new Map(originalNodes.map(node=>[node.id,node]));
    const ordered=[...source.playback.map(event=>byOriginalId.get(event.nodeId)).filter(Boolean),...originalNodes];
    const anchors=new Map();
    let previous;
    for (const node of ordered) {
      const pitch=notePitch(node.root);
      if (!anchors.has(pitch)) {
        const options=Object.entries(tunings).flatMap(([string,tuning])=>Array.from({length:24},(_,i)=>i+1).filter(fret=>(fret+tuning)%12===pitch).map(fret=>({string,fret})));
        const reference=previous || groups[pitch].find(item=>item.string==='E'||item.string==='A') || node;
        const score=option=>Math.hypot(option.fret-reference.fret,option.string===reference.string?0:1);
        options.sort((a,b)=>score(a)-score(b)||a.fret-b.fret);
        anchors.set(pitch,options[0]);
      }
      previous=anchors.get(pitch);
    }
    const positions=[...anchors.values()].map(anchor=>anchor.fret);
    const firstFret=Math.min(...positions);
    const fretCount=Math.max(7,Math.max(...positions)-firstFret+1);
    const frets=Array.from({length:fretCount},(_,i)=>firstFret+i);
    const right=left+pitchWidth*fretCount;
    chartRight=Math.max(chartRight,right);
    const top=230+index*950;
    const section={...original,left,right,frets,boundaries:Array.from({length:fretCount+1},(_,i)=>left+i*pitchWidth),centers:frets.map((_,i)=>left+(i+.5)*pitchWidth),rows:[top+180,top+540],stringLabels:['A','Low E'],titleY:top+40,titleSize:32,fretY:top+100,fretFontSize:35,stringFontSize:34,top:top+125,bottom:top+630};
    delete section.box;
    sections.push(section);
    for (const group of Object.values(groups)) {
      const anchor=anchors.get(notePitch(group[0].root));
      for (const [qualityIndex,node] of group.entries()) {
        nodes.push({...node,...anchor,x:left+(anchor.fret-firstFret+.5)*pitchWidth+(qualityIndex-(group.length-1)/2)*120,y:section.rows[anchor.string==='A'?0:1],shape:'circle',radius:46,width:0,height:0,fontSize:Math.min(32,node.fontSize || 32,110/node.chord.length),textOffset:4,badgeOffset:-68});
      }
    }
    const localNodes=nodes.filter(node=>node.section===original.id);
    const byId=Object.fromEntries(localNodes.map(node=>[node.id,node]));
    for (const edge of source.edges.filter(edge=>edge.section===original.id)) {
      const rebuilt={...edge};
      delete rebuilt.path;
      if (edge.target && byId[edge.source] && byId[edge.target]) rebuilt.path=routePath(byId[edge.source],byId[edge.target],localNodes,section);
      edges.push(rebuilt);
    }
  }
  // Preserve node iteration/step order, as well as playback references.
  const byId=Object.fromEntries(nodes.map(node=>[node.id,node]));
  const orderedNodes=source.nodes.map(node=>byId[node.id]);
  const first=byId[source.startNodeId];
  const allFrets=sections.flatMap(section=>section.frets);
  return {...source,nodes:orderedNodes,edges,
    description:`${source.title} in ${source.key}. Root movement on the low E and A strings with nearby root positions.`,
    durationLabels:source.durationLabels.map(label=>({...label,offsetX:0,offsetY:100})),
    layout:{...source.layout,sections,viewBox:`0 0 ${chartRight+200} ${sections.length*950+280}`,subtitle:`${source.key} · Low E + A · Frets ${Math.min(...allFrets)}–${Math.max(...allFrets)}`,annotations:[],legend:undefined,footerY:sections.length*950+240,startLabel:{x:first.x,y:first.y+140},startOutline:{x:first.x-55,y:first.y-55,width:110,height:110}},
    tip:{title:'Two-string map. ',text:'Roots use low E and A with nearby root positions. Different qualities share the same root anchor; follow the visit numbers.'},
  };
}
