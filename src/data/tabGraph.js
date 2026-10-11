import { standardTuning, noteName, tabStringNames } from './tabInput.js';
import { routePath } from './stringLayout.js';

// Convert tab input to the graph consumed by SongChart. Physical positions are
// shared nodes; each playback event can reference several simultaneous notes.
export function buildTabGraph(parsed, {title='Original practice phrase', tuning=standardTuning, capo=0}={}) {
  const nodes=[],edges=[],playback=[],sections=[];
  const groups=[];
  for(const event of parsed.events) {
    const frets=event.notes.filter(note=>note.fret!==null&&note.fret>0).map(note=>note.fret);
    const group=groups.at(-1);
    const range=[...(group?.frets||[]),...frets];
    if(!group || group.blockIndex!==event.blockIndex || group.events.length>=12 || (range.length&&Math.max(...range)-Math.min(...range)>6)) groups.push({events:[event],frets,blockIndex:event.blockIndex});
    else {group.events.push(event);group.frets=range;}
  }
  for(const [groupIndex,group] of groups.entries()) {
    const id=`tab-section-${groupIndex}`;
    // Keep every section on the same full neck, so positions do not jump
    // when playback changes staff or fret range.
    const frets=Array.from({length:13},(_,i)=>i);
    const left=190, spacing=140;
    const centers=frets.map((_,i)=>left+spacing*(i+.5));
    const rows=Array.from({length:6},(_,i)=>350+i*220);
    const section={id,title:`Staff ${group.blockIndex+1} · Steps ${group.events[0].index+1}–${group.events.at(-1).index+1}`,left,right:left+frets.length*spacing,boundaries:Array.from({length:frets.length+1},(_,i)=>left+i*spacing),centers,frets,rows,top:275,bottom:1520,fretY:1700,stringLabels:tabStringNames,stringFontSize:34,fretFontSize:35,color:'#c43b32'};
    sections.push(section);
    const local=new Map();
    for(const event of group.events) {
      const nodeIds=[];
      const eventNotes=event.notes.map(note=>{
        if(note.fret===null) return {...note,nodeId:null,midi:null};
        const nodeId=`${id}-s${note.string}-f${note.fret}`;
        const midi=tuning[note.string]+note.fret+capo;
        if(note.fret>12) return {...note,nodeId:null,midi};
        if(!local.has(nodeId)) {
          const node={id:nodeId,kind:'note',section:id,chord:noteName(midi),root:noteName(midi),fret:note.fret,string:['e','B','G','D','A','E'][note.string],stringIndex:note.string,x:centers[frets.indexOf(note.fret)],y:rows[note.string],shape:'circle',radius:46,fontSize:34,badgeOffset:-72};
          local.set(nodeId,node);nodes.push(node);
        }
        nodeIds.push(nodeId);
        return {...note,nodeId,midi};
      });
      const label=eventNotes.map(note=>note.midi===null?'×':noteName(note.midi)).join(' + ');
      playback.push({nodeId:nodeIds[0]||null,nodeIds,notes:eventNotes,label,chord:label,bars:1,section:id,blockIndex:event.blockIndex,column:event.column});
    }
    const events=playback.filter(event=>event.section===id);
    const seen=new Set();
    for(let i=0;i<events.length-1;i++) {
      const sources=events[i].notes.filter(note=>note.nodeId);
      for(const target of events[i+1].notes.filter(note=>note.nodeId)) {
        const source=[...sources].sort((a,b)=>Number(a.string!==target.string)-Number(b.string!==target.string)||Math.abs(a.fret-target.fret)-Math.abs(b.fret-target.fret))[0];
        if(!source || source.nodeId===target.nodeId) continue;
        const edgeId=`${source.nodeId}-to-${target.nodeId}`;
        if(seen.has(edgeId)) continue;
        seen.add(edgeId);
        const from=local.get(source.nodeId),to=local.get(target.nodeId);
        let path;
        try {path=routePath(from,to,[...local.values()],section);} catch {path=undefined;}
        edges.push({id:edgeId,source:source.nodeId,target:target.nodeId,section:id,path,width:6,firstVisit:playback.indexOf(events[i])});
      }
    }
  }
  const width=Math.max(...sections.map(section=>section.right))+230;
  return {id:'tab-practice',kind:'notes',title,key:capo?`Capo ${capo}`:'Guitar tab',beatsPerBar:1,nodeColorMode:'rainbow',nodes,edges,playback,startNodeId:playback.find(event=>event.nodeId)?.nodeId,layout:{viewBox:`0 0 ${width} 1850`,sections,subtitle:'Six strings · Notes in playback order',footer:'Follow the step numbers. A repeated position lists each visit.'}};
}
