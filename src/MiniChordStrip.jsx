import React from "react";
import { timelineColor, timelineLabel } from "./data/timelinePresentation.js";

export default function MiniChordStrip({
  timeline,
  activeIndex,
  position = 0,
  colors,
  darkMode,
  nodeLabels,
  onSeek,
  disabled,
  itemName = 'chords',
  visibleCount = 3,
  interactive = true,
}) {
  const Note = interactive ? 'button' : 'div';
  const centeredIndex = Math.max(0, activeIndex);
  const events = [...timeline.events, ...timeline.events.slice(0, visibleCount - 1)];
  return (
    <div
      className="mini-chord-window"
      aria-label={`${visibleCount === 2 ? "Current and next" : "Current, next, and then"} ${itemName}`}
    >
      <div
        className="mini-chord-strip"
        style={{ transform: `translateX(${(-centeredIndex * 100) / visibleCount}%)` }}
      >
        {events.map((event, index) => {
          const current = index === centeredIndex;
          const nearby = index >= centeredIndex && index < centeredIndex + visibleCount;
          const label = timelineLabel(event, nodeLabels);
          const color = timelineColor(colors[index % timeline.events.length], darkMode);
          const remaining = Math.max(0, Math.min(event.duration, event.start + event.duration - position));
          const beatsRemaining = event.duration > 0 ? remaining / event.duration * event.beats : 0;
          const beatCount = Math.ceil(beatsRemaining);
          const displayedBeats = current ? beatCount : Math.ceil(event.beats);
          return (
            <div
              key={index}
              className="mini-chord-slot"
              style={{ flexBasis: `${100 / visibleCount}%` }}
              aria-hidden={!nearby || undefined}
              inert={!nearby}
            >
              <span className="mini-chord-role">
                {index === centeredIndex ? "Current" : index === centeredIndex + 1 ? "Next" : "Then"}
              </span>
              <Note
                type={interactive ? "button" : undefined}
                className={`mini-chord ${current ? "active" : ""}`}
                style={{ "--chord-color": color || "var(--accent)" }}
                disabled={interactive ? disabled : undefined}
                onClick={interactive ? () => onSeek(event.start) : undefined}
                aria-current={current ? "step" : undefined}
                aria-label={`${label}${current ? `, ${beatCount} ${beatCount === 1 ? 'beat' : 'beats'} until next chord` : ''}${interactive ? `, seek to ${event.start.toFixed(1)} seconds` : ''}`}
                title={event.chord}
              >
                {label}
                <span key={current ? 'current-beats' : 'upcoming-beats'} className={`chord-countdown${current ? ' is-current' : ''}`} role="img" aria-label={`${displayedBeats} ${itemName === 'notes' ? 'steps' : 'beats'}${current ? ' remaining' : ''}`}>
                  {Array.from({ length: Math.ceil(event.beats) }, (_, beat) => <span
                    key={beat}
                    className={`chord-countdown-dot${beat >= displayedBeats ? ' elapsed' : ''}`}
                    style={{ '--beat-bounce-delay': `${280 + beat * 45}ms` }}
                    aria-hidden="true"
                  />)}
                </span>
              </Note>
            </div>
          );
        })}
      </div>
    </div>
  );
}
