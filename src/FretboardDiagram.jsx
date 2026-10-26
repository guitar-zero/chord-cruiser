import React, { useId } from 'react';
import { guitarStrings } from './shellVoicing.js';

// Shared full-neck overview for chord shells and individual tab notes.
// String indices run from low E (0) to high E (5).
export default function FretboardDiagram({notes=[],activeFret,color='var(--accent)',darkMode,vertical=false,label='Guitar fretboard', minFrets=12, maxFrets}) {
  const id=useId().replaceAll(':','');
  const count=maxFrets ?? Math.max(minFrets,...notes.map(note=>note.fret));
  notes=notes.filter(note=>note.fret<=count);
  if(activeFret>count) activeFret=undefined;
  const nut=180, spacing=52, end=nut+count*spacing, height=260;
  const fretX=fret=>fret===0?nut-17:nut+(fret-.5)*spacing;
  const y=string=>190-string*24;
  return <svg className={vertical?'fretboard-overview is-vertical':'fretboard-overview'} viewBox={vertical?`0 0 ${height} ${end+24}`:`0 0 ${end+24} ${height}`} role="img" aria-label={label}>
    <defs><linearGradient id={`neck-${id}`} x2="0" y2="1"><stop stopColor={darkMode?'#49392c':'#eed7ae'}/><stop offset=".5" stopColor={darkMode?'#352b24':'#f5e5c8'}/><stop offset="1" stopColor={darkMode?'#453329':'#dec195'}/></linearGradient></defs>
    <g transform={vertical?`translate(${height} 0) rotate(90)`:undefined}>
      <g aria-hidden="true">
        <path d="M178 70 L145 48 Q113 24 36 42 L18 56 L18 204 L36 218 Q113 236 145 212 L178 190 Z" fill={`url(#neck-${id})`} stroke={darkMode?'#876a4e':'#a78860'} strokeWidth="3"/>
        {[48,89,130].map(x=><g key={x}><path d={`M${x} 47 V26 M${x} 212 V235`} stroke="#8b9296" strokeWidth="5"/><rect x={x-9} y="18" width="18" height="13" rx="5" fill="#bbc0bd"/><rect x={x-9} y="231" width="18" height="13" rx="5" fill="#bbc0bd"/><circle cx={x} cy="65" r="7" fill="#bbc0bd"/><circle cx={x} cy="194" r="7" fill="#bbc0bd"/></g>)}
      </g>
      <rect x={nut} y="56" width={count*spacing} height="148" rx="4" fill={`url(#neck-${id})`} stroke={darkMode?'#876a4e':'#a78860'} strokeWidth="2"/>
      {[3,5,7,9,12].filter(fret=>fret<=count).flatMap(fret=>(fret===12?[105,155]:[130]).map(dotY=><circle key={`${fret}-${dotY}`} cx={fretX(fret)} cy={dotY} r="6" fill={darkMode?'#ead8bb':'#725e46'} opacity=".5"/>))}
      {activeFret!==undefined&&<rect x={activeFret===0?nut-31:fretX(activeFret)-spacing/2} y="51" width={activeFret===0?29:spacing} height="158" rx="5" fill={color} fillOpacity=".17" stroke={color} strokeWidth="2"/>}
      {Array.from({length:count+1},(_,i)=><line key={i} x1={nut+i*spacing} x2={nut+i*spacing} y1="56" y2="204" stroke={i===0?'#e8e5d8':'#aaaead'} strokeWidth={i===0?6:3}/>)}
      {guitarStrings.map((string,i)=>{
        const note=notes.find(note=>note.string===i);
        const isRoot=notes.some(note=>note.string===i&&note.role==='R');
        return <g key={string}>
          {isRoot&&<line x1={nut-25} x2={end} y1={y(i)} y2={y(i)} stroke={color} strokeWidth="10" opacity=".18" strokeLinecap="round"/>}
          <line x1={nut-25} x2={end} y1={y(i)} y2={y(i)} stroke={isRoot?color:darkMode?'#d0c8b4':'#827b6a'} strokeWidth={isRoot?3.5:2.5-i*.3}/>
          <text x={nut-43} y={y(i)+4} textAnchor="middle" fontSize="13" fontWeight={isRoot?800:400} fill="var(--ink)">{string}</text>
          {!note&&<text x={nut-17} y={y(i)+4} textAnchor="middle" fontSize="14" fill="var(--ink)">×</text>}
        </g>;
      })}
      {notes.map(note=>{
        const isRoot=note.role==='R';
        return <g key={`${note.string}:${note.fret}`}><circle cx={fretX(note.fret)} cy={y(note.string)} r="15" fill={color} stroke={isRoot?"#050505":"var(--surface)"} strokeWidth={isRoot?3:2}/><text x={fretX(note.fret)} y={y(note.string)+4.5} textAnchor="middle" fontSize="13" fontWeight={isRoot?900:700} fill={darkMode?'var(--ink)':'white'}>{note.role||note.fret}</text></g>;
      })}
      {Array.from({length:count},(_,i)=>{
        const active=i+1===activeFret,x=fretX(i+1);
        return <g key={i}>{active&&<rect x={x-15} y="20" width="30" height="24" rx="6" fill={color}/>}<text x={x} y="37" textAnchor="middle" fontSize="15" fontWeight={active?800:600} fill={active?(darkMode?'var(--ink)':'white'):'var(--ink)'}>{i+1}</text></g>;
      })}
    </g>
  </svg>;
}
