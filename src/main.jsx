import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import ChordPlayer from './ChordPlayer.jsx';
import ChartCarousel from './ChartCarousel.jsx';
import { songs, songsById } from './data/songs.js';
import { chartTarget } from './audio/chartTarget.js';
import { keyRoots, minorKeyRoots, displayNote, transposeSong, notePitch } from './data/transpose.js';

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
  const [search, setSearch] = useState('');
  const filteredSongs = songs.filter(item => item.title.toLowerCase().includes(search.toLowerCase()));
  const [playback, setPlayback] = useState(null);
  const svgRef = useRef(null);
  const playerRef = useRef(null);
  const song = useMemo(() => transposeSong(songsById[songId], targetKey), [songId, targetKey]);
  const selectionKey = `${songId}:${song.key}`;
  const availableKeys = /minor|-$/.test(song.key) ? minorKeyRoots : keyRoots;
  const handleChordChange = useCallback(value => setPlayback(value && { ...value, key: song.key }), [song.key]);
  const target = chartTarget(songId, playback?.song === songId && playback?.key === song.key ? playback.event : null);
  const currentChord = target && { ...target, visitIndex: playback?.visitIndex, seekVersion: playback?.seekVersion };
  function changeSong(id) {
    playerRef.current?.stop();
    setPlayback(null); setTargetKey(''); setSongId(id);
  }
  function changeKey(key) {
    playerRef.current?.stop();
    setPlayback(null); setTargetKey(key);
  }
  function downloadSvg() {
    const clone = svgRef.current.cloneNode(true);
    clone.querySelectorAll('rect').forEach(rect => rect.style.removeProperty('transition'));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${song.id}-${song.key.replaceAll(' ', '-')}-${clone.dataset.sectionId}.svg`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <main>
    <header>
      <div><p className="eyebrow">CHORD PATHS</p><h1>{song.title}</h1><p className="subtitle">In {song.key} · Follow the movement</p></div>
      <div className="header-actions">
      <button className="theme-toggle" type="button" aria-pressed={darkMode} onClick={() => setDarkMode(value => !value)}>{darkMode ? '☀ Light mode' : '☾ Dark mode'}</button>
      <button className="download" type="button" onClick={downloadSvg}>Download section SVG <span aria-hidden="true">↗</span></button>
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
      <span className="note">{filteredSongs.length} of {songs.length} songs</span>
    </nav>
    <ChordPlayer key={selectionKey} ref={playerRef} song={songId} songData={song} onChordChange={handleChordChange} />
    <ChartCarousel key={selectionKey} ref={svgRef} song={song} darkMode={darkMode} currentChord={currentChord} />
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
