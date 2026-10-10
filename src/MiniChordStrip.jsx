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
}) {
  const centeredIndex = Math.max(0, activeIndex);
  const events = [...timeline.events, ...timeline.events.slice(0, 2)];
  return (
    <div
      className="mini-chord-window"
      aria-label="Current, next, and then chords"
    >
      <div
        className="mini-chord-strip"
        style={{ transform: `translateX(${(-centeredIndex * 100) / 3}%)` }}
      >
        {events.map((event, index) => {
          const current = index === centeredIndex;
          const nearby = index >= centeredIndex && index <= centeredIndex + 2;
          const label = timelineLabel(event, nodeLabels);
          const color = timelineColor(colors[index % timeline.events.length], darkMode);
          const remaining = Math.max(0, Math.min(event.duration, event.start + event.duration - position));
          const beatsRemaining = event.duration > 0 ? remaining / event.duration * event.beats : 0;
          const beatCount = Math.ceil(beatsRemaining);
          return (
            <div
              key={index}
              className="mini-chord-slot"
              aria-hidden={!nearby || undefined}
              inert={!nearby}
            >
              <span className="mini-chord-role">
                {index === centeredIndex ? "Current" : index === centeredIndex + 1 ? "Next" : "Then"}
                {current && <span className="chord-countdown"> · {beatCount} {beatCount === 1 ? 'beat' : 'beats'}</span>}
              </span>
              <button
                type="button"
                className={`mini-chord ${current ? "active" : ""}`}
                style={{ "--chord-color": color || "var(--accent)" }}
                disabled={disabled}
                onClick={() => onSeek(event.start)}
                aria-current={current ? "step" : undefined}
                aria-label={`${label}${current ? `, ${beatCount} ${beatCount === 1 ? 'beat' : 'beats'} until next chord` : ''}, seek to ${event.start.toFixed(1)} seconds`}
                title={event.chord}
              >
                {label}
                {current && <span className="chord-time-remaining" aria-hidden="true" style={{transform:`scaleX(${event.duration > 0 ? remaining / event.duration : 0})`}} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
