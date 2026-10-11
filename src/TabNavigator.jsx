import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import SongChart from './SongChart.jsx';
import PageNavigation from './PageNavigation.jsx';
import useTheme from './hooks/useTheme.js';
import useStepPlayback from './hooks/useStepPlayback.js';
import { demoTab, parseTab, parseTuning, standardTuning, tabStringNames, noteName } from './data/tabInput.js';
import { buildTabGraph } from './data/tabGraph.js';
import { validateTabUrl } from './data/tabUrl.js';
import { readTabImportResponse } from './data/tabImportResponse.js';
import { sectionTimeline } from './audio/sectionTimeline.js';
import { NotePlayer } from './audio/notePlayer.js';
import { shortcutKey } from './keyboardShortcuts.js';

const SharedChart = memo(SongChart);
const defaultTabUrl = 'https://tabs.ultimate-guitar.com/tab/led-zeppelin/stairway-to-heaven-tabs-9488';

const techniques={h:'hammer-on',p:'pull-off',b:'bend',r:'release','/':'slide up','\\':'slide down','~':'vibrato','<':'harmonic','>':'harmonic','(':'ghost note',')':'ghost note'};
export default function TabNavigator() {
  const [darkMode,setDarkMode]=useTheme();
  const [text,setText]=useState(demoTab),[parsed,setParsed]=useState(()=>parseTab(demoTab));
  const [title,setTitle]=useState('Original practice phrase');
  const [url,setUrl]=useState(defaultTabUrl),[sourceUrl,setSourceUrl]=useState('');
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [pace,setPace]=useState(40),[loop,setLoop]=useState(false),[sound,setSound]=useState(true);
  const [showFullPath,setShowFullPath]=useState(false),[hideGuides,setHideGuides]=useState(false);
  const [tuningText,setTuningText]=useState('E2 A2 D3 G3 B3 E4'),[tuning,setTuning]=useState(standardTuning),[capo,setCapo]=useState(0);
  const request=useRef(null),audio=useRef(null),svgRef=useRef(null);
  const song=useMemo(()=>buildTabGraph(parsed,{title,tuning,capo}),[parsed,title,tuning,capo]);
  const playback=useStepPlayback(song.playback,pace,loop);
  const {timeline,active,activeIndex,playing,clockRef,seek,toggle,stop,seekVersion,loopIteration}=playback;
  const segments=useMemo(()=>sectionTimeline(timeline,song),[timeline,song]);
  const sectionId=active.section;
  const sectionIndex=song.layout.sections.findIndex(section=>section.id===sectionId);
  const current=useMemo(()=>active.nodeId ? {node:active.nodeId,visitIndex:activeIndex,seekVersion,loopIteration,isPlaying:playing} : null,[active.nodeId,activeIndex,seekVersion,loopIteration,playing]);
  useEffect(()=>{document.title='Tab navigator · Chord map';return()=>{request.current?.abort();audio.current?.close();};},[]);
  useEffect(()=>{importTab(defaultTabUrl);},[]);
  const shortcuts=useRef(null);shortcuts.current={toggle,stop};
  useEffect(()=>{
    const handler=event=>{
      const key=shortcutKey(event);
      if(key==='g'){event.preventDefault();setHideGuides(value=>!value);}
      if(key==='x'){event.preventDefault();setShowFullPath(value=>!value);}
      if(key==='d'){event.preventDefault();setDarkMode(value=>!value);}
      if(event.code==='Space' && key===' ' && !event.target.closest?.('button, a, [role="button"]')){event.preventDefault();shortcuts.current.toggle();}
    };
    window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
  },[setDarkMode]);
  useEffect(()=>{
    if(!playing||!sound) return;
    if(!audio.current) audio.current=new NotePlayer();
    audio.current.play(active.notes.map(note=>note.midi).filter(midi=>midi!==null)).catch(()=>setError('Sound is unavailable; visual playback still works.'));
  },[playing,activeIndex,loopIteration,sound,song]);
  function load(content,name,source='') {
    try {const next=parseTab(content);stop();setParsed(next);setTitle(name);setSourceUrl(source);setError('');}
    catch(e){setError(e.message);}
  }
  async function importLink(event) {
    event.preventDefault();
    await importTab(url);
  }
  async function importTab(link) {
    setError('');
    try{validateTabUrl(link);}catch(e){setError(e.message);return;}
    request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);
    try {
      const response=await fetch(`/api/tab-import?url=${encodeURIComponent(link)}`,{signal:controller.signal});
      const data=await readTabImportResponse(response);
      load(data.text,data.title,validateTabUrl(link).href);setText(data.text);
    } catch(e){if(e.name!=='AbortError')setError(e.message);}
    finally{if(request.current===controller)setLoading(false);}
  }
  function chooseSection(id){const segment=segments.find(segment=>segment.id===id);if(segment)seek(segment.start);}
  return <main className="tab-navigator">
    <PageNavigation current="tabs" />
    <header><div><p className="eyebrow">NOTES ON THE FRETBOARD</p><h1>{song.title}</h1><p className="subtitle">Six strings · Guitar tab · {song.playback.length} practice steps</p></div><div className="header-actions"><button className="theme-toggle" type="button" aria-keyshortcuts="d" onClick={()=>setDarkMode(value=>!value)}>{darkMode?'☀ Light mode':'☾ Dark mode'} <kbd>D</kbd></button></div></header>
    <section className="player tab-input" aria-label="Guitar tab input">
      <form onSubmit={importLink}><label htmlFor="tab-link">Ultimate Guitar text-tab link</label><div className="tab-input-row"><input id="tab-link" type="url" required value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://tabs.ultimate-guitar.com/tab/…"/><button className="theme-toggle" disabled={loading}>{loading?'Importing…':'Import tab'}</button></div></form>
      <details><summary>Paste or edit guitar tab</summary><p className="note">Use six aligned string rows, high E first and low E last.</p><textarea aria-label="Guitar tab text" spellCheck="false" value={text} onChange={e=>setText(e.target.value)}/><button className="theme-toggle" type="button" onClick={()=>load(text,'Pasted guitar tab')}>Use this tab</button><button className="theme-toggle" type="button" onClick={()=>{setText(demoTab);load(demoTab,'Original practice phrase');}}>Load demo</button></details>
      <p className="note">Public text tabs supported. If a link cannot be imported, open the source and paste its text. Pro and interactive formats need a text version.</p>
      {error&&<p className="audio-error" role="alert">{error}</p>}
    </section>
    <nav className="song-picker" aria-label="Tab display controls"><label>Section <select value={sectionId} onChange={e=>chooseSection(e.target.value)}>{song.layout.sections.map(section=><option key={section.id} value={section.id}>{section.title}</option>)}</select></label><div className="chart-display-controls"><button className="theme-toggle" type="button" aria-keyshortcuts="g" aria-pressed={!hideGuides} onClick={()=>setHideGuides(value=>!value)}>{hideGuides?'Show':'Hide'} guiding lines <kbd>G</kbd></button><button className="theme-toggle" type="button" aria-keyshortcuts="x" aria-pressed={showFullPath} onClick={()=>setShowFullPath(value=>!value)}>{showFullPath?'Hide':'Show'} full path during playback <kbd>X</kbd></button></div></nav>
    <section className="player" aria-label="Note playback">
      <div className="transport"><button className="play" type="button" onClick={toggle} aria-keyshortcuts="Space">{playing?'Ⅱ Pause':'▶ Play notes'}</button><button type="button" onClick={stop}>■ Stop</button><button type="button" disabled={activeIndex===0} onClick={()=>seek(timeline.events[activeIndex-1].start)}>← Previous</button><button type="button" disabled={activeIndex===timeline.events.length-1} onClick={()=>seek(timeline.events[activeIndex+1].start)}>Next →</button><label>Practice pace <input type="number" min="30" max="240" value={pace} disabled={playing} onChange={e=>setPace(Math.min(240,Math.max(30,Number(e.target.value)||30)))}/> steps/min</label><label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/> Sound</label><label><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/> Loop</label></div>
      <div className="player-status"><span className="current-chord">{active.label}</span><span>Step {activeIndex+1} of {song.playback.length} · Section {sectionIndex+1} of {song.layout.sections.length}</span></div>
      <p className="note">{active.notes.map(note=>`${tabStringNames[note.string]}: ${note.fret===null?'mute':note.fret===0?'open':`fret ${note.fret}`} ${note.midi===null?'':`(${noteName(note.midi)})`}${note.technique?` · ${techniques[note.technique]||note.technique}`:''}`).join(' · ')}</p>
      <details><summary>Tuning & capo</summary><div className="transport"><label>Low → high <input className="tab-tuning-input" value={tuningText} onChange={e=>setTuningText(e.target.value)}/></label><button type="button" onClick={()=>{try{const next=parseTuning(tuningText);stop();setTuning(next);setError('');}catch(e){setError(e.message);}}}>Apply tuning</button><label>Capo <input type="number" min="0" max="12" value={capo} onChange={e=>{stop();setCapo(Math.max(0,Math.min(12,Number(e.target.value)||0)));}}/></label></div><p className="note">Fret numbers are relative to the capo. Match the tuning given in the source tab.</p></details>
    </section>
    <div className={`chart-sections${playing?' is-playing':''}`} style={{'--chart-columns':1}}><section className="chart-section"><p className="panel-caption"><span>{playing?'Current section':'Section'} · {sectionIndex+1} / {song.layout.sections.length}</span><span className="panel-section-title">{song.layout.sections[sectionIndex].title}</span></p><div className="chart"><SharedChart visiblePlaybackSteps={5} ref={svgRef} song={song} sectionId={sectionId} darkMode={darkMode} currentChord={current} playbackVisitIndex={activeIndex} playbackIsPlaying={playing} playbackClockRef={clockRef} hideGuidingLines={hideGuides} hideOtherNodes={playing&&!showFullPath} showStartMarker={activeIndex===0}/></div></section></div>
    <section className="player tab-input"><details><summary>Source tab · staff {active.blockIndex+1}</summary><pre>{parsed.blocks[active.blockIndex].map((row,i)=>`${row.label||['e','B','G','D','A','E'][i]}|${row.body}`).join('\n')}</pre></details>{parsed.warnings.map(warning=><p className="note" key={warning}>{warning}</p>)}</section>
    <footer>{sourceUrl?<a href={sourceUrl} target="_blank" rel="noreferrer">Source tab ↗</a>:'Original demo or pasted tab'} · <kbd>Space</kbd> Play/pause · <kbd>G</kbd> Guide lines · <kbd>X</kbd> Full path</footer>
  </main>;
}
