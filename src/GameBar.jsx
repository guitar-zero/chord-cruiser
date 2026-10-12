import React, { forwardRef } from 'react';
import { gameBarState } from './data/gameBar.js';

export default forwardRef(function GameBar({ timeline, sectionSegments, position, disabled, onSeek, mini = false }, ref) {
  const game = gameBarState(timeline, sectionSegments, position);
  return <div ref={ref} className={`game-bar${mini ? ' is-mini' : ''}`}>
    <div className="game-bar-heading"><strong>✦ SONG RUN</strong><span>Bar {game.bar} / {game.bars}</span><span>{Math.round(game.percent)}%</span></div>
    <div className="game-bar-sections" aria-label="Song sections">{sectionSegments.map((segment, index) => <button key={`${segment.id}:${index}`} type="button" disabled={disabled} style={{ flex: segment.end - segment.start }} aria-current={index === game.index ? 'step' : undefined} onClick={() => onSeek(segment.start)} title={segment.label}>{segment.label || `Section ${index + 1}`}</button>)}</div>
    <div className="game-bar-track">
      <div className="game-bar-energy" aria-hidden="true" style={{ width: `${game.percent}%` }} />
      <input type="range" min="0" max={timeline.duration} step=".05" value={position} disabled={disabled} aria-label={mini ? 'Mini game song position' : 'Game song position'} aria-valuetext={`Bar ${game.bar} of ${game.bars}, ${Math.round(game.percent)} percent`} onChange={event => onSeek(Number(event.target.value))} />
      <div className="game-bar-boundaries" aria-hidden="true">{sectionSegments.slice(1).map((segment, index) => <span key={`${segment.id}:${index}`} style={{ left: `${segment.start / timeline.duration * 100}%` }} />)}</div>
      <span className="game-bar-runner" aria-hidden="true" style={{ left: `${game.percent}%` }}>✦</span>
    </div>
    <div className="game-bar-actions"><button type="button" disabled={disabled || game.index === 0} onClick={() => onSeek(sectionSegments[game.index - 1].start)} aria-label="Previous game section">‹</button><span>{sectionSegments[game.index]?.label || 'Song'}</span><button type="button" disabled={disabled || game.index >= sectionSegments.length - 1} onClick={() => onSeek(sectionSegments[game.index + 1].start)} aria-label="Next game section">›</button><button type="button" disabled={disabled} onClick={() => onSeek(0)} title="Return to the first chord">↺ Start</button></div>
    {!mini && <div className="game-bar-stages" aria-label="Jump to a game section">{sectionSegments.map((segment, index) => <button key={`${segment.id}:${index}`} type="button" disabled={disabled} aria-current={index === game.index ? 'step' : undefined} onClick={() => onSeek(segment.start)} title={segment.label}>Stage {index + 1}</button>)}</div>}
  </div>;
});
