import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { chordGrade, grades, shellTargets, ShellGameRound, normalizeJudgment } from './audio/game.js';
import { openGuitarInput } from './audio/guitarInput.js';
import { estimateHeardChord } from './audio/heardChord.js';
import GameJudgment, { GameMiss } from './GameJudgment.jsx';

function NodeJudgment({ result }) {
  const [anchor, setAnchor] = useState(null);
  const playedRef = useRef(null);
  useEffect(() => {
    if (!result) return;
    let frame;
    function measure() {
      const node = [...document.querySelectorAll('[data-node-id]')].find(element =>
        element.dataset.nodeId === result.nodeId && element.getAttribute('aria-hidden') !== 'true');
      const bounds = node?.querySelector('[data-node-shape]')?.getBoundingClientRect();
      if (bounds && bounds.bottom > 0 && bounds.top < window.innerHeight) {
        const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
        const width = Math.min(160, (window.innerWidth - 40) / 2);
        const margin = showYouPlayed(result) ? 112 : width / 2 + 12;
        const clampX = value => Math.max(margin, Math.min(window.innerWidth - margin, value));
        const playedHeight = playedRef.current?.getBoundingClientRect().height || 65;
        const badgeY = Math.max(showYouPlayed(result) ? playedHeight + 56 : 48, Math.min(window.innerHeight - 80, y - 85));
        setAnchor({ left: x, top: y, '--badge-width': `${width}px`,
          '--left-flight': `${clampX(x - 140) - x}px`, '--right-flight': `${clampX(x + 140) - x}px`,
          '--flight-y': `${badgeY - y}px`,
          '--heard-left': `${clampX(x - 140)}px`,
          '--heard-top': `${badgeY - 44}px`, '--miss-top': `${Math.max(12, y - 110) - y}px` });
      } else setAnchor(null);
      frame = requestAnimationFrame(measure);
    }
    measure();
    return () => cancelAnimationFrame(frame);
  }, [result]);
  if (!result || !anchor) return null;
  if (result.missed) return createPortal(<div className="game-node-judgment" style={anchor} aria-hidden="true"><div className="game-miss-popup" data-game-judgment="true"><GameMiss attempt={result.id} /></div></div>, document.body);
  return createPortal(<div className="game-node-judgment" style={anchor} aria-hidden="true">
    <div key={`${result.id}:chord:${result.chord}`} className="game-judgment-wing is-left" data-grade={result.chord} data-game-judgment="true"><GameJudgment kind="Chord" grade={result.chord} attempt={result.id} />{result.chord && <Firework />}</div>
    <div key={`${result.id}:timing`} className="game-judgment-wing is-right" data-grade={result.timing} data-game-judgment="true"><GameJudgment kind="Timing" grade={result.timing} attempt={result.id} /><Firework /></div>
    {showYouPlayed(result) && <div key={result.id} ref={playedRef} className="game-you-played" data-game-judgment="true"><span>You played</span><strong>{estimateHeardChord(result.playedPitches)?.label || 'Uncertain chord'}</strong></div>}
  </div>, document.body);
}

function Firework() {
  return <div className="game-firework" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--ray-angle': `${index * 45}deg` }} />)}</div>;
}

function showYouPlayed(result) {
  return result && ['Good', 'Okay', 'Nope'].includes(result.chord) && result.playedPitches?.length > 0;
}

export default function GameMode({ timeline, songData, darkMode, playbackState, seekVersion, loopIteration, position, getPosition, onReady, onJudgment, playControls }) {
  const targets = useMemo(() => shellTargets(timeline, songData.nodes), [timeline, songData]);
  const [devices, setDevices] = useState([]);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [channel, setChannel] = useState(0);
  const [latency, setLatency] = useState(0);
  const [monitoring, setMonitoring] = useState({ enabled: true, volume: .65, reverb: .22 });
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState('');
  const [level, setLevel] = useState(0);
  const [result, setResult] = useState(null);
  const attemptId = useRef(0);
  const [score, setScore] = useState({ chord: 0, timing: 0, judged: 0 });
  const [history, setHistory] = useState([]);
  const historyRef = useRef(null), followHistory = useRef(true);
  useEffect(() => {
    if (followHistory.current && historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [history]);
  const input = useRef(null), generation = useRef(0), pending = useRef(null), round = useRef(null);
  const latest = useRef(null), lastMeter = useRef(0);
  latest.current = { playbackState, getPosition, latency, onReady, monitoring, onJudgment };
  useEffect(() => { input.current?.setMonitoring(monitoring); }, [monitoring]);
  useEffect(() => {
    round.current = new ShellGameRound(targets, playbackState === 'stopped' ? 0 : position);
    pending.current = null;
    setResult(null);
  }, [targets, seekVersion, loopIteration, playbackState === 'stopped']);
  useEffect(() => {
    if (playbackState === 'stopped') {
      setScore({ chord: 0, timing: 0, judged: 0 });
      setHistory([]);
      followHistory.current = true;
    }
  }, [playbackState]);
  useEffect(() => {
    return () => {
      generation.current++;
      input.current?.close();
      latest.current.onReady(false);
    };
  }, []);
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), 1800);
    return () => clearTimeout(timer);
  }, [result]);
  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const found = await navigator.mediaDevices.enumerateDevices();
    setDevices(found.filter(device => device.kind === 'audioinput'));
  }
  useEffect(() => {
    const refresh = () => { refreshDevices().catch(() => {}); };
    refresh();
    navigator.mediaDevices?.addEventListener('devicechange', refresh);
    return () => navigator.mediaDevices?.removeEventListener('devicechange', refresh);
  }, []);
  function disconnect(message = '') {
    generation.current++;
    input.current?.close();
    input.current = null;
    pending.current = null;
    setStatus('disconnected'); setLevel(0); setError(message);
    latest.current.onReady(false);
  }
  function finish(value) {
    value = normalizeJudgment(value);
    latest.current.onJudgment?.(value);
    const completed = { ...value, id: value.id ?? ++attemptId.current };
    setResult(completed);
    setHistory(previous => [...previous, completed]);
    setScore(previous => ({
      chord: previous.chord + (value.missed ? 0 : Math.max(0, grades.indexOf(value.chord)) * 25),
      timing: previous.timing + (value.missed ? 0 : Math.max(0, grades.indexOf(value.timing)) * 25),
      judged: previous.judged + 1,
    }));
  }
  function analyse({ rms, attack, pitches, now }) {
    if (now - lastMeter.current > 80) { setLevel(Math.min(1, rms * 12)); lastMeter.current = now; }
    const live = latest.current;
    if (live.playbackState !== 'playing') return;
    const time = live.getPosition() - live.latency / 1000;
    // Collect the best stable chord sample after the attack; timing is already fixed.
    if (pending.current && now >= pending.current.until) {
      const attempt = pending.current;
      if (attempt.playedPitches.length) finish({ ...attempt.result, chord: attempt.best, playedPitches: attempt.playedPitches });
      else round.current?.releaseAttack(attempt.visitIndex);
      pending.current = null;
    } else if (pending.current && now >= pending.current.after && rms > .004) {
      const grade = chordGrade(pitches, pending.current.expected);
      if (grades.indexOf(grade) > grades.indexOf(pending.current.best) || !pending.current.playedPitches.length) {
        pending.current.best = grade;
        pending.current.playedPitches = [...pitches];
      }
    }
    if (attack && !pending.current) {
      const hit = round.current?.attack(time);
      if (hit) {
        const value = { id: ++attemptId.current, nodeId: hit.target.nodeId, chord: null, timing: hit.timing, offset: hit.offset, label: hit.target.chord };
        pending.current = { result: value, visitIndex: hit.target.index, expected: hit.target.pitches, after: now + 70, until: now + 180, best: 'Nope', playedPitches: [] };
      }
    }
    for (const target of round.current?.misses(time) || []) {
      finish({ nodeId: target.nodeId, chord: null, timing: null, label: target.chord, missed: true });
    }
  }
  async function connect() {
    if (!deviceId) { setError('Choose your audio interface first.'); return; }
    disconnect();
    const token = generation.current;
    setStatus('connecting'); setError('');
    try {
      const connection = await openGuitarInput(deviceId, channel, analyse, () => disconnect('Audio input disconnected or suspended. Reconnect to continue.'), latest.current.monitoring);
      if (token !== generation.current) { connection.close(); return; }
      input.current = connection;
      connection.setMonitoring(latest.current.monitoring);
      setStatus('connected'); latest.current.onReady(true);
      const selected = connection.stream.getAudioTracks()[0].getSettings().deviceId;
      if (selected) setDeviceId(selected);
      await refreshDevices().catch(() => {});
      return true;
    } catch (failure) {
      if (token !== generation.current) return;
      disconnect(failure.name === 'NotAllowedError' ? 'Allow audio input access in your browser, then reconnect.' : failure.message || 'Could not open the audio interface.');
    }
  }
  async function allowAudioAccess() {
    const token = generation.current;
    setRequestingAccess(true); setError('');
    let permissionStream;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw Error('Audio input requires HTTPS or localhost.');
      permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token === generation.current) await refreshDevices();
    } catch (failure) {
      if (token === generation.current) setError(failure.name === 'NotAllowedError' ? 'Allow audio input access in your browser to choose your interface.' : failure.message);
    } finally {
      permissionStream?.getTracks().forEach(track => track.stop());
      if (token === generation.current) setRequestingAccess(false);
    }
  }
  const running = playbackState !== 'stopped';
  return <>
    <section className="game-panel" aria-label="Guitar game mode">
      <div className="game-banner"><strong><span aria-hidden="true">✦ </span>GUITAR GAME MODE</strong><span>{status === 'connected' ? '♫ LIVE INPUT' : 'CONNECT YOUR GUITAR'}</span></div>
      <p className="game-track-title">{songData.title} · {songData.key}</p>
      <div className="game-entry-layout"><div className="game-connection-card">
      <div className="game-connection-guide"><span aria-hidden="true">♫ → ▣ → ♡</span><strong>1 · Plug in your guitar buddy!</strong><p>Guitar → audio interface → computer.<br />Choose your interface, connect, and give us a little strum!</p></div>
      <details className="game-setup" open={status !== 'connected'}>
      <summary>{status === 'connected' ? 'Audio & sound settings' : '1 · Choose your audio interface, then connect'}</summary>
      <div className="game-input-controls">
        {!devices.some(device => device.deviceId && device.label) && <button type="button" disabled={requestingAccess || running} onClick={allowAudioAccess}>{requestingAccess ? 'Requesting access…' : 'Allow audio access to list interfaces'}</button>}
        <label>Audio interface <select value={deviceId} disabled={requestingAccess || running || status === 'connecting'} onChange={event => { disconnect(); setDeviceId(event.target.value); }}>
          <option value="" disabled>Choose your audio interface…</option>
          {devices.filter(device => device.deviceId).map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Audio input ${index + 1}`}</option>)}
        </select></label>
        <label>Guitar channel <select value={channel} disabled={requestingAccess || running || status === 'connecting'} onChange={event => { disconnect(); setChannel(Number(event.target.value)); }}><option value={0}>1 / Left</option><option value={1}>2 / Right</option></select></label>
        <button type="button" disabled={running || status === 'connecting' || requestingAccess || !deviceId} onClick={status === 'connected' ? () => disconnect() : connect}>{status === 'connecting' ? 'Connecting…' : status === 'connected' ? 'Disconnect input' : 'Connect audio interface'}</button>
        <label>Input delay <input type="number" min="0" max="500" step="10" value={latency} disabled={running} onChange={event => setLatency(Math.max(0, Math.min(500, Number(event.target.value) || 0)))} /> ms</label>
      </div>
      <div className="game-monitor-controls" aria-label="Guitar sound">
        <label><input type="checkbox" checked={monitoring.enabled} onChange={event => setMonitoring(previous => ({ ...previous, enabled: event.target.checked }))} /> Hear guitar in browser</label>
        <strong>Clean jazz · Warm tone + room reverb</strong>
        <label>Guitar volume <input type="range" min="0" max="100" value={Math.round(monitoring.volume * 100)} onChange={event => setMonitoring(previous => ({ ...previous, volume: Number(event.target.value) / 100 }))} /><output>{Math.round(monitoring.volume * 100)}%</output></label>
        <label>Reverb <input type="range" min="0" max="60" value={Math.round(monitoring.reverb * 100)} onChange={event => setMonitoring(previous => ({ ...previous, reverb: Number(event.target.value) / 100 }))} /><output>{Math.round(monitoring.reverb * 100)}%</output></label>
      </div>
      <p className="game-monitor-hint">Listen through headphones. Turn off your interface’s direct monitoring to hear only the browser’s jazz tone.</p>
      </details>
      <div className="game-input-level"><span>Guitar signal</span><meter min="0" max="1" value={level} />{status === 'connected' && <span>{level > .02 ? 'Signal received · ready to play' : 'Strum a chord to check input before Play'}</span>}</div>
      </div>{playControls}</div>
      <div className="game-scoreboard"><span>♫ Chord score <b>{score.chord.toLocaleString()}</b></span><span>★ Timing score <b>{score.timing.toLocaleString()}</b></span><span>Judged <b>{score.judged}</b></span></div>
      {error && <p role="alert" className="audio-error">{error}</p>}
      {!targets.length && <p>No playable shell chords in this chart.</p>}
      {targets.length < timeline.events.length && <p>{timeline.events.length - targets.length} chart visits without a displayed shell are skipped.</p>}
      <div className="game-feedback" role="status" aria-live="polite" aria-atomic="true">
        {result ? <span>{result.label}: {result.missed ? 'MISS!' : `Chord ${result.chord} · Timing ${result.timing}`}</span> : <span>{status !== 'connected' ? 'Connect your interface to begin.' : playbackState === 'playing' ? 'Follow the count-in, then strum on each chord change.' : playbackState === 'paused' ? 'Game paused — resume when ready.' : 'Ready — press Play game for a one-bar count-in.'}</span>}
      </div>
      <small>Clean-input detection is experimental. Timing: Perfect ≤60 ms · Great ≤120 ms · Good ≤200 ms · Okay ≤320 ms · Nope beyond. Adjust input delay if every strum reads late.</small>
    </section>
    <NodeJudgment result={result} />
    <section className="game-mode-status" aria-label="Game score and chord results">
      <div className="game-history-heading"><strong>GAME MODE</strong><span>{status === 'connected' ? '♫ Live' : 'Connect guitar'}</span></div>
      <span>Chord <b>{score.chord.toLocaleString()}</b> · Timing <b>{score.timing.toLocaleString()}</b></span>
      <div className="game-history-scroll" ref={historyRef} tabIndex="0" role="region" aria-label="Chord result history" onScroll={event => {
        const element = event.currentTarget;
        followHistory.current = element.scrollHeight - element.scrollTop - element.clientHeight < 12;
      }}>
        {history.length ? <table className="game-history-table">
          <thead><tr><th scope="col">Chord</th><th scope="col">Accuracy</th><th scope="col">Timing</th></tr></thead>
          <tbody>{history.map((entry, index) => <tr key={entry.id}>
            <th scope="row"><span className="game-history-number">{index + 1}</span> {entry.label}</th>
            {entry.missed ? <td colSpan="2" className="game-history-missed"><b>MISS!</b></td> : <><td data-grade={entry.chord}><b>{entry.chord}</b></td>
            <td data-grade={entry.timing} title={`${Math.round(Math.abs(entry.offset) * 1000)} ms ${entry.offset < 0 ? 'early' : 'late'}`}><b>{entry.timing}</b></td></>}
          </tr>)}</tbody>
        </table> : <p className="game-history-empty">Your chord results will appear here.</p>}
      </div>
    </section>
  </>;
}
