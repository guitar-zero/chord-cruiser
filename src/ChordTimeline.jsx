import React, { useEffect, useRef, useState } from 'react';

export function layoutChordLabels(events, duration, width) {
  const lanes = [];
  return events.map(event => {
    const label = event.chord.replace('mMaj7', 'mΔ7').replace('maj7', 'Δ7').replaceAll('b', '♭');
    const size = label.length * 8 + 16;
    const startX = event.start / duration * width;
    const x = Math.max(0, Math.min(width - size, startX));
    let lane = lanes.findIndex(end => end + 8 <= x);
    if (lane < 0) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = x + size;
    return { label, x, lane, size, startX };
  });
}

export default function ChordTimeline({ timeline, activeIndex, onSeek, disabled }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const element = ref.current;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth || 900));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const labels = layoutChordLabels(timeline.events, timeline.duration, width);
  const laneCount = Math.max(1, ...labels.map(label => label.lane + 1));
  return <div ref={ref} className="chord-timeline" style={{ height: `${laneCount * 29 + 12}px` }} aria-label="Chords along the playback timeline">
    {labels.map((label, index) => <React.Fragment key={index}>
      <span aria-hidden="true" className={`chord-tick ${index === activeIndex ? 'active' : ''}`} style={{ left: `${label.startX}px`, height: `${label.lane * 29 + 10}px` }} />
      <button type="button" disabled={disabled} className={`timeline-chord ${index === activeIndex ? 'active' : ''}`} style={{ left: `${label.x}px`, top: `${label.lane * 29 + 9}px`, width: `${label.size}px` }} onClick={() => onSeek(timeline.events[index].start)} aria-current={index === activeIndex ? 'step' : undefined} aria-label={`${label.label}, bar ${timeline.events[index].startBeat / (timeline.beatsPerBar || 4) + 1}, seek to ${timeline.events[index].start.toFixed(1)} seconds`} title={`${timeline.events[index].chord} · ${timeline.events[index].bars} ${timeline.events[index].bars === 1 ? 'bar' : 'bars'}`}>
        {label.label}
      </button>
    </React.Fragment>)}
  </div>;
}
