import React, { useEffect, useRef, useState, useMemo } from 'react';
import { buildTimeline, playbackSongs } from './audio/songs.js';
import { JazzPlayer } from './audio/ensemble.js';
import ChordTimeline from './ChordTimeline.jsx';

export default function ChordPlayer({ song, onChordChange }) {
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(30);
  const [drumVolume, setDrumVolume] = useState(24);
  const [bassVolume, setBassVolume] = useState(38);
  const [state, setState] = useState('stopped');
  const [position, setPosition] = useState(0);
  const [error, setError] = useState('');
  const player = useRef(null);
  const frame = useRef(null);
  const timeline = useMemo(() => buildTimeline(playbackSongs[song], bpm), [song, bpm]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); player.current?.stop(); player.current = null; }, []);
  function stop() {
    cancelAnimationFrame(frame.current);
    player.current?.stop(); player.current = null;
    setState('stopped'); setPosition(0);
  }
  function tick() {
    const current = player.current;
    if (!current || current.context.state === 'closed') return;
    const elapsed = current.elapsed;
    setPosition(Math.min(elapsed, current.timeline.duration));
    if (elapsed >= current.timeline.duration) {
      current.stop(); player.current = null; setState('stopped'); return;
    }
    frame.current = requestAnimationFrame(tick);
  }
  async function toggle() {
    setError('');
    try {
      if (state === 'playing') {
        await player.current.pause(); cancelAnimationFrame(frame.current); setState('paused');
      } else if (state === 'paused') {
        await player.current.resume(); setState('playing'); tick();
      } else {
        setState('starting');
        const startAt = position >= timeline.duration ? 0 : position;
        setPosition(startAt);
        const current = new JazzPlayer(); player.current = current;
        current.master.gain.value = volume / 100;
        current.drumBus.gain.value = drumVolume / 100;
        current.bassBus.gain.value = bassVolume / 100;
        await current.start(timeline, startAt);
        if (player.current !== current) return;
        setState('playing'); tick();
      }
    } catch (e) { stop(); setError(e.message || 'Could not start audio.'); }
  }
  function seek(value) {
    const next = Math.max(0, Math.min(timeline.duration, Number(value)));
    cancelAnimationFrame(frame.current);
    if (player.current?.timeline) {
      player.current.seek(next);
      if (state === 'playing') tick();
    }
    setPosition(next);
  }
  const active = timeline.events.find(e => position >= e.start && position < e.start + e.duration);
  const running = state !== 'stopped';
  const activeIndex = timeline.events.indexOf(active);
  useEffect(() => { onChordChange?.((running || position > 0) && activeIndex >= 0 ? { song, event: timeline.events[activeIndex] } : null); }, [song, activeIndex, running, position > 0, onChordChange, timeline]);
  return <section className="player" aria-label="Chord playback" aria-busy={state === 'starting'}>
    <div className="transport">
      <button className="play" type="button" onClick={toggle} disabled={state === 'starting'}>{state === 'starting' ? <><span className="spinner" aria-hidden="true" /> Loading sounds…</> : state === 'playing' ? 'Ⅱ Pause' : state === 'paused' ? '▶ Resume' : '▶ Play chords'}</button>
      <button type="button" onClick={stop} disabled={!running && position === 0}>■ Stop</button>
      <label>Tempo <input type="number" min="40" max="240" step="5" value={bpm} disabled={running} onChange={e => setBpm(Math.max(40, Math.min(240, Number(e.target.value) || 40)))} /> BPM</label>
      <label>Piano <input type="range" min="0" max="100" value={volume} onChange={e => { const value = Number(e.target.value); setVolume(value); if (player.current) player.current.master.gain.setTargetAtTime(value / 100, player.current.context.currentTime, .02); }} /></label>
      <label>Brushes <input aria-label="Brush drums volume" type="range" min="0" max="100" value={drumVolume} onChange={e => { const value = Number(e.target.value); setDrumVolume(value); if (player.current) player.current.drumBus.gain.setTargetAtTime(value / 100, player.current.context.currentTime, .02); }} /></label>
      <label>Bass <input aria-label="Bass volume" type="range" min="0" max="100" value={bassVolume} onChange={e => { const value = Number(e.target.value); setBassVolume(value); if (player.current) player.current.bassBus.gain.setTargetAtTime(value / 100, player.current.context.currentTime, .02); }} /></label>
    </div>
    <div className="player-status"><span className="current-chord">{running && active ? active.chord.replaceAll('b', '♭') : 'Soft piano, bass + brushes'}</span><span>{running && active ? `${active.section ? active.section + ' · ' : ''}Bar ${Math.floor(position * bpm / 240) + 1} of ${timeline.beats / 4}` : `${timeline.beats / 4} bars · ${Math.round(timeline.duration)} seconds`}</span></div>
    <input className="seek" type="range" min="0" max={timeline.duration} step="0.05" value={position} disabled={state === 'starting'} aria-label="Track playback position" aria-valuetext={`${Math.round(position)} of ${Math.round(timeline.duration)} seconds`} onChange={e => seek(e.target.value)} style={{ '--played': `${position / timeline.duration * 100}%` }} />
    <ChordTimeline timeline={timeline} activeIndex={running || position > 0 ? activeIndex : -1} onSeek={seek} disabled={state === 'starting'} />
    {song === 'take-the-a-train' && <p className="note">Plays the full source chart, including the Gm7 → C7 second ending omitted from the simplified map.</p>}
    {error && <p role="alert" className="audio-error">{error}</p>}
  </section>;
}
