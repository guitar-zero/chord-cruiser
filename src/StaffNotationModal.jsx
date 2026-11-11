import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { staffChord, staffChordFlavor, staffNotePositions } from './data/staffNotation.js';
import { chordQualityColor } from './data/chordQualityColors.js';
import { timelineColor } from './data/timelinePresentation.js';
import { staffScrollPercent, STAFF_PLAY_SLOT, STAFF_LEADING_EVENTS } from './data/staffMotion.js';
import TempoControl from './TempoControl.jsx';

function WrittenChord({ event, current, previous, darkMode, onSeek, disabled, rootOnly }) {
  const notes = useMemo(() => staffChord(event.chord), [event.chord]);
  const positioned = useMemo(() => staffNotePositions(rootOnly ? notes.filter(note => note.isRoot) : notes), [notes, rootOnly]);
  const color = timelineColor(chordQualityColor(event.chord), darkMode);
  return <button type="button" className={`staff-chord${current ? ' is-current' : ''}${previous ? ' is-previous' : ''}`} aria-current={current ? 'step' : undefined}
    aria-label={`${event.chord}${current ? ', current chord' : ''}, seek to chord`} disabled={disabled} onClick={() => onSeek(event.start)} style={{ '--notation-color': color }}>
    <svg viewBox="0 0 280 300" role="img" aria-label={`${event.chord} ${rootOnly ? 'root note' : 'arpeggio'} in treble clef, root highlighted`}>
      {positioned.map(note => {
        const x = note.x, y = 186 - (note.step - 30) * 12;
        return <g key={`${note.letter}:${note.accidental}`} fill={note.isRoot ? color : 'currentColor'}>
          {note.accidental && <text x={note.accidentalX} y={y + 9} textAnchor="middle" fontSize="27" fontFamily="'Apple Symbols', 'Noto Music', 'Segoe UI Symbol', serif">{note.accidental}</text>}
          <ellipse cx={x} cy={y} rx="13" ry="8.5" transform={`rotate(-15 ${x} ${y})`} />
          <line x1={x + (note.step >= 34 ? -12 : 12)} x2={x + (note.step >= 34 ? -12 : 12)} y1={y} y2={y + (note.step >= 34 ? 42 : -42)} stroke={note.isRoot ? color : 'currentColor'} strokeWidth="2" />
        </g>;
      })}
      {!notes.length && <text x="140" y="143" textAnchor="middle" fill="currentColor" fontSize="22">N.C.</text>}
      <text x="140" y="260" textAnchor="middle" fill={color} fontFamily="system-ui, sans-serif" fontWeight="700" fontSize="25">{staffChordFlavor(event.chord)}</text>
    </svg>
  </button>;
}

export default function StaffNotationModal({ title, timeline, activeIndex, playbackClockRef, position, darkMode, onClose, onSeek, onTogglePlayback, onStop, bpm, onTempoChange, tempoDisabled, isPlaying, disabled }) {
  const ref = useRef(null), stripRef = useRef(null), titleId = useId();
  const [rootOnly, setRootOnly] = useState(true);
  const [smallScreen, setSmallScreen] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setSmallScreen(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const trigger = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); if (trigger?.isConnected) trigger.focus({ preventScroll: true }); };
  }, []);
  const index = Math.max(0, activeIndex);
  const visibleCount = smallScreen ? 3 : 5;
  const currentColor = timelineColor(chordQualityColor(timeline.events[index].chord), darkMode);
  const renderedIndex = index + STAFF_LEADING_EVENTS;
  const pausedPosition = isPlaying ? null : position;
  useLayoutEffect(() => {
    let frame;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    function draw() {
      const clock = playbackClockRef?.current;
      const offset = staffScrollPercent(clock, index, visibleCount, media.matches);
      if (stripRef.current) stripRef.current.style.transform = `translateX(${offset}%)`;
      if (isPlaying) frame = requestAnimationFrame(draw);
    }
    draw();
    // Paused seeks publish their clock in the parent's layout effect.
    if (!isPlaying) frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playbackClockRef, index, visibleCount, isPlaying, pausedPosition]);
  const events = [...timeline.events.slice(-STAFF_LEADING_EVENTS), ...timeline.events, ...timeline.events.slice(0, 5)];
  return <dialog ref={ref} className="staff-notation-modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="chord-chart-modal-heading"><h2 id={titleId}>{title} · Staff mode</h2><button type="button" autoFocus onClick={onClose} aria-label="Close staff mode">×</button></div>
    <div className="staff-notation-mode" role="group" aria-label="Notes to display">
      <button type="button" className="theme-toggle" aria-pressed={!rootOnly} onClick={() => setRootOnly(false)}>Arpeggio</button>
      <button type="button" className="theme-toggle" aria-pressed={rootOnly} onClick={() => setRootOnly(true)}>Root</button>
    </div>
    <div className="staff-notation-window" style={{ '--staff-slots': visibleCount, '--notation-color': currentColor }}>
      <svg className="staff-notation-background" viewBox={`0 0 ${280 * visibleCount} 300`} aria-hidden="true">
        {[90, 114, 138, 162, 186].map(y => <line key={y} x1="0" x2={280 * visibleCount} y1={y} y2={y} stroke="currentColor" strokeWidth="1.2" opacity=".5" />)}
        <text x="4" y="190" fontFamily="'Apple Symbols', 'Noto Music', 'Segoe UI Symbol', serif" fontSize="138" fill="currentColor">𝄞</text>
        <rect x={STAFF_PLAY_SLOT * 280 - 112} y="50" width="224" height="232" rx="12" fill={currentColor} fillOpacity=".06" stroke={currentColor} strokeWidth="2" />
        <text x={STAFF_PLAY_SLOT * 280} y="28" textAnchor="middle" className="staff-current-label">PLAY HERE</text>
      </svg>
      <div className="staff-notation-flow">
      <div ref={stripRef} className="staff-notation-strip">
        {events.map((event, i) => <div key={i} className="staff-notation-slot" inert={i < renderedIndex - 1 || i >= renderedIndex + visibleCount - 1} aria-hidden={i < renderedIndex - 1 || i >= renderedIndex + visibleCount - 1 || undefined}>
          <WrittenChord event={event} current={i === renderedIndex} previous={i === renderedIndex - 1} darkMode={darkMode} disabled={disabled} onSeek={onSeek} rootOnly={rootOnly} />
        </div>)}
      </div>
      </div>
    </div>
    <div className="staff-notation-footer"><span>Play each chord as it reaches the box · click a chord to seek</span><strong style={{ color: currentColor }}>Current: {staffChordFlavor(timeline.events[index].chord)}</strong><TempoControl bpm={bpm} onChange={onTempoChange} disabled={tempoDisabled} /><button type="button" className="theme-toggle" onClick={onStop} disabled={disabled || !tempoDisabled}>Stop</button><button type="button" className="theme-toggle" aria-keyshortcuts="Space" title="Play or pause (Space)" onClick={onTogglePlayback} disabled={disabled}>{isPlaying ? 'Pause' : 'Play'}</button><span><kbd>Space</kbd> Play/pause · <kbd>X</kbd> Staff mode · Esc to close</span></div>
  </dialog>;
}
