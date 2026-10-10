import React, { useEffect, useState } from 'react';
import { beatCountdown } from './audio/pipeProgress.js';
import { timelineColor, timelineLabel } from './data/timelinePresentation.js';
import { rapidPassage } from './data/graphPresentation.js';

export default function SectionBeatDots({ playbackClockRef, visible, song, colors, darkMode, visitIndex, isPlaying }) {
  const [countdown, setCountdown] = useState({ total: 0, remaining: 0 });
  useEffect(() => {
    if (!visible) return;
    let frame;
    function update() {
      const clock = playbackClockRef?.current;
      const total = Math.ceil(clock?.beats || 0);
      const remaining = beatCountdown(clock).beatsLeft;
      setCountdown(previous => previous.total === total && previous.remaining === remaining ? previous : { total, remaining });
      frame = requestAnimationFrame(update);
    }
    update();
    return () => cancelAnimationFrame(frame);
  }, [playbackClockRef, visible]);
  const currentIndex = Math.max(0, visitIndex ?? 0);
  const nextIndex = (currentIndex + 1) % song.playback.length;
  const labels = Object.fromEntries(song.nodes.map(node => [node.id, node.chord]));
  const currentLabel = timelineLabel(song.playback[currentIndex], labels);
  const nextLabel = timelineLabel(song.playback[nextIndex], labels);
  const currentColor = timelineColor(colors[currentIndex], darkMode) || 'var(--accent)';
  const nextColor = timelineColor(colors[nextIndex], darkMode) || currentColor;
  const passage = rapidPassage(song, currentIndex);
  const quickStart = passage ? Math.min(currentIndex, passage.start) : 0;
  const quickIndices = passage ? Array.from({ length: passage.end - quickStart + 2 }, (_, offset) => (quickStart + offset) % song.playback.length) : [];
  const quickLabels = quickIndices.map(index => timelineLabel(song.playback[index], labels));
  const dotColor = fraction => `color-mix(in srgb, ${currentColor} ${(1 - fraction) * 100}%, ${nextColor})`;
  return <span className="section-beat-dots" style={{ '--beat-dot-count': countdown.total + 2, '--beat-dot-gaps': countdown.total + 1, '--beat-label-ink': darkMode ? '#073840' : '#ffffff', '--beat-duration': `${60 / (playbackClockRef?.current?.bpm || 120)}s`, '--beat-next-color': nextColor }} role="img" aria-label={visible ? `Current ${currentLabel}, ${countdown.remaining} beats left, next ${nextLabel}${passage ? `, quick changes: ${quickLabels.join(', ')}` : ''}` : 'Beat countdown'}>
    {visible && !passage && <span className="section-beat-dot remaining section-beat-chord" style={{ '--chord-label-color': currentColor }} aria-hidden="true">{currentLabel}</span>}
    {visible && !passage && Array.from({ length: countdown.total }, (_, index) => <span
      key={index === 0 ? `first-${visitIndex}` : index}
      aria-hidden="true"
      style={{ background: dotColor((index + 1) / (countdown.total + 1)), animationPlayState: isPlaying ? 'running' : 'paused' }}
      className={`section-beat-dot section-beat-number${index >= countdown.total - countdown.remaining ? ' remaining' : ''}${countdown.remaining > 0 && index === countdown.total - countdown.remaining ? ' final-beat' : ''}${index === 0 && countdown.remaining === countdown.total ? ' starting-beat' : ''}`}
    >{countdown.remaining > 0 && index === countdown.total - countdown.remaining ? index + 1 : null}</span>)}
    {visible && !passage && <span className="section-beat-dot remaining section-beat-chord" style={{ '--chord-label-color': nextColor }} aria-hidden="true">{nextLabel}</span>}
    {visible && passage && <span className="section-quick-chords" aria-hidden="true">
      <span className="section-quick-caption">Quick changes</span>
      {quickIndices.map((index, offset) => <React.Fragment key={`${passage.start}:${offset}`}>
        {offset > 0 && <span className="section-quick-arrow">→</span>}
        <span className={`section-beat-dot remaining section-beat-chord${index === currentIndex ? ' is-current' : ''}`} style={{ '--chord-label-color': timelineColor(colors[index], darkMode) || currentColor, animationPlayState: isPlaying ? 'running' : 'paused' }}>{quickLabels[offset]}</span>
      </React.Fragment>)}
    </span>}
  </span>;
}
