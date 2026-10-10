import React, { forwardRef, useMemo } from "react";
import { quickChangeRanges } from './data/graphPresentation.js';

const ProgressBar = forwardRef(function ProgressBar(
  { timeline, sectionSegments, position, disabled, onSeek, mini = false },
  ref,
) {
  const quickChanges = useMemo(() => quickChangeRanges(timeline.events), [timeline]);
  return (
    <div ref={ref} className="section-progress">
      <div className="progress-sections" aria-label="Playback sections">
        {sectionSegments.map((segment, index) => (
          <button
            key={`${segment.id}:${index}`}
            type="button"
            className={quickChanges.some(({ start, end }) => timeline.events[start].start < segment.end && timeline.events[end].start + timeline.events[end].duration > segment.start) ? 'has-quick-changes' : undefined}
            disabled={disabled}
            onClick={() => onSeek(segment.start)}
            title={segment.label}
            aria-label={`${segment.label}, seek to ${segment.start.toFixed(1)} seconds`}
            aria-current={
              position >= segment.start && position < segment.end
                ? "step"
                : undefined
            }
            style={{
              width: `${((segment.end - segment.start) / timeline.duration) * 100}%`,
            }}
          >
            {mini ? segment.label.split(" · ")[0] : segment.label}
          </button>
        ))}
      </div>
      {quickChanges.length > 0 && <div className="progress-quick-markers" aria-label="Quick-change warnings">
        {quickChanges.map(({ start, end }) => {
          const event = timeline.events[start];
          const label = `Quick changes · bar ${event.startBeat / timeline.beatsPerBar + 1}`;
          return <button key={start} type="button" disabled={disabled} className="progress-danger-marker"
            style={{ left: `${event.start / timeline.duration * 100}%` }}
            onClick={() => onSeek(event.start)} title={label} aria-label={`${label}, seek to quick changes`}
            aria-current={position >= event.start && position < timeline.events[end].start + timeline.events[end].duration ? 'step' : undefined}
          >⚠</button>;
        })}
      </div>}
      <input
        className="seek"
        type="range"
        min="0"
        max={timeline.duration}
        step="0.05"
        value={position}
        disabled={disabled}
        aria-label={
          mini ? "Mini track playback position" : "Track playback position"
        }
        aria-valuetext={`${Math.round(position)} of ${Math.round(timeline.duration)} seconds`}
        onChange={(e) => onSeek(e.target.value)}
        style={{ "--played": `${(position / timeline.duration) * 100}%` }}
      />
      <div className="bar-ticks" aria-hidden="true">
        {Array.from(
          {
            length: Math.max(
              0,
              Math.ceil(timeline.beats / timeline.beatsPerBar) - 1,
            ),
          },
          (_, index) => (
            <span
              key={index}
              style={{
                left: `${(((index + 1) * timeline.beatsPerBar) / timeline.beats) * 100}%`,
              }}
            />
          ),
        )}
      </div>
      <div className="section-boundaries" aria-hidden="true">
        {sectionSegments.slice(1).map((segment, index) => (
          <span
            key={index}
            style={{ left: `${(segment.start / timeline.duration) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
});

export default ProgressBar;
