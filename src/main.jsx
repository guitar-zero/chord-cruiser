import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import ChordPlayer from './ChordPlayer.jsx';
import IndicatorLaunch from './IndicatorLaunch.jsx';
import ChartSections from './ChartSections.jsx';
import { exportAllSections } from './exportAllSections.js';
import { songs, songsById } from './data/songs.js';
import { chartTarget } from './audio/chartTarget.js';
import { keyRoots, minorKeyRoots, displayNote, transposeSong, notePitch } from './data/transpose.js';
import { redStartingColor } from './data/routePalette.js';
import { stackSharedNodes } from './data/stackSharedNodes.js';
import { threeStringLayout } from './data/threeStringLayout.js';
import { twoStringLayout } from './data/stringLayout.js';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try { const saved = localStorage.getItem('chord-map-theme'); if (saved) return saved === 'dark'; } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    try { localStorage.setItem('chord-map-theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);
  const [songId, setSongId] = useState('all-of-me');
  const [targetKey, setTargetKey] = useState('');
  const [hideGuidingLines, setHideGuidingLines] = useState(false);
  const [twoStrings, setTwoStrings] = useState(true);
  const [search, setSearch] = useState('');
  const filteredSongs = songs.filter(item => item.title.toLowerCase().includes(search.toLowerCase()));
  const [flight, setFlight] = useState(null);
  const launchFinished = useRef(null);
  const finishLaunch = useCallback(() => {
    setFlight(null);
    launchFinished.current?.();
    launchFinished.current=null;
  }, []);
  const [playback, setPlayback] = useState(null);
  const svgRef = useRef(null);
  const playerRef = useRef(null);
  const sectionsRef = useRef(null);
  const song = useMemo(() => {
    const transposed = transposeSong(songsById[songId], targetKey);
    const positioned=twoStrings ? twoStringLayout(transposed) : threeStringLayout(transposed);
    return redStartingColor(twoStrings ? positioned : stackSharedNodes(positioned));
  }, [songId, targetKey, twoStrings]);
  const selectionKey = `${songId}:${song.key}`;
  const availableKeys = /minor|-$/.test(song.key) ? minorKeyRoots : keyRoots;
  const handleChordChange = useCallback(value => { setPlayback(value && { ...value, key: song.key }); if (!value) setFlight(null); }, [song.key]);
  const target = chartTarget(songId, playback?.song === songId && playback?.key === song.key ? playback.event : null);
  const currentChord = target && { ...target, visitIndex: playback?.visitIndex, seekVersion: playback?.seekVersion };
  function launchIndicator(nodeId, rect) {
    const shape=[...sectionsRef.current.querySelectorAll('[data-node-id]')].find(node=>node.dataset.nodeId===nodeId)?.querySelector('[data-node-shape]');
    if(!shape || !rect || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds=shape.getBoundingClientRect();
    return new Promise(resolve => {
    launchFinished.current=resolve;
    setFlight({from:{x:rect.x+rect.width/2,y:rect.y+rect.height/2},to:{x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2},size:Math.max(bounds.width,bounds.height)+32});
    });
  }
  function changeSong(id) {
    playerRef.current?.stop();
    finishLaunch();
    setPlayback(null); setTargetKey(''); setSongId(id);
  }
  function changeKey(key) {
    playerRef.current?.stop();
    finishLaunch();
    setPlayback(null); setTargetKey(key);
  }
  function downloadSvg() {
    const clone = exportAllSections(song, sectionsRef.current.querySelectorAll('svg[data-section-id]'), darkMode);
    clone.querySelectorAll('rect').forEach(rect => rect.style.removeProperty('transition'));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${song.id}-${song.key.replaceAll(' ', '-')}-all-sections.svg`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main>
    <header>
      <div><p className="eyebrow">CHORD PATHS</p><h1>{song.title}</h1><p className="subtitle">In {song.key}</p></div>
      <div className="header-actions">
      <button className="theme-toggle" type="button" aria-pressed={darkMode} onClick={() => setDarkMode(value => !value)}>{darkMode ? '☀ Light mode' : '☾ Dark mode'}</button>
      <button className="download" type="button" onClick={downloadSvg}>Download all sections <span aria-hidden="true">↗</span></button>
      </div>
    </header>
    <nav className="song-picker" aria-label="Choose a song">
      <label htmlFor="song-search">Find a song <input id="song-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by title…" /></label>
      <label htmlFor="song-select">Song <select id="song-select" value={songId} onChange={event => changeSong(event.target.value)}>
        {!filteredSongs.some(item => item.id === songId) && <option value={songId}>{song.title}</option>}
        {filteredSongs.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select></label>
      <label htmlFor="key-select">Key <select id="key-select" value={targetKey} onChange={event => changeKey(event.target.value)}>
        <option value="">Original: {songsById[songId].key}</option>
        {availableKeys.filter(root => notePitch(root) !== notePitch(songsById[songId].key)).map(root => <option key={root} value={root}>{displayNote(root)}{/minor|-$/.test(song.key) ? ' minor' : ''}</option>)}
      </select></label>
      <button className="string-toggle theme-toggle" type="button" aria-pressed={twoStrings} onClick={() => setTwoStrings(value => !value)}>{twoStrings ? 'Use 3 strings: E + A + D' : 'Use 2 strings: E + A'}</button>
      <button className="theme-toggle" type="button" aria-pressed={hideGuidingLines} onClick={() => setHideGuidingLines(value => !value)}>{hideGuidingLines ? 'Show guiding lines' : 'Hide guiding lines'}</button>
    </nav>
    <ChordPlayer key={selectionKey} ref={playerRef} song={songId} songData={song} darkMode={darkMode} onPlaybackLaunch={launchIndicator} onChordChange={handleChordChange} />
    <div ref={sectionsRef}><ChartSections suppressIndicator={Boolean(flight)} hideGuidingLines={hideGuidingLines} columns={1} key={`${selectionKey}:${twoStrings}`} ref={svgRef} song={song} darkMode={darkMode} currentChord={currentChord} /></div>
    <IndicatorLaunch flight={flight} onComplete={finishLaunch} />
    <footer>A movement map based on <a href={song.sourceUrl} target="_blank" rel="noreferrer">the source chart</a>. {song.footerNote}</footer>
  </main>;
}

// Reuse the root across Vite updates; recreating it leaves orphaned app/audio
// instances and can accumulate headers in the same container.
const container = document.getElementById('root');
const root = import.meta.hot?.data.root || createRoot(container);
if (import.meta.hot) {
  import.meta.hot.data.root = root;
  import.meta.hot.accept();
}
root.render(<App />);
