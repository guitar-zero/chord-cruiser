import React, { useEffect, useRef, useState } from 'react';

export function layoutChordLabels(events, duration, width, nodeLabels = {}) {
  const lanes = [];
  return events.map(event => {
    const label = nodeLabels[event.nodeId] || event.chord.replace('mMaj7', 'mΔ7').replace('maj7', 'Δ7').replaceAll('b', '♭');
    const size = label.length * 8 + 16;
    const startX = event.start / duration * width;
    const x = Math.max(0, Math.min(width - size, startX));
    let lane = lanes.findIndex(end => end + 8 <= x);
    if (lane < 0) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = x + size;
    return { label, x, lane, size, startX };
  });
}

export default function ChordTimeline({ timeline, activeIndex, onSeek, disabled, colors = [], darkMode, nodeLabels = {} }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const element = ref.current;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth || 900));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const darkColors = { '#c43b32':'#ff8278', '#cc480e':'#ffa263', '#267b99':'#70d8ef', '#8b4695':'#d8a2ee', '#29805d':'#83d7ae', '#a06a16':'#e5bd70', '#be3d6a':'#f38eae', '#485aa3':'#a3b1ff', '#576b24':'#bbcf81' };
  const colorAt = index => darkMode ? darkColors[colors[index]] || colors[index] : colors[index];
  const labels = layoutChordLabels(timeline.events, timeline.duration, width, nodeLabels);
  const laneCount = Math.max(1, ...labels.map(label => label.lane + 1));
  return <div ref={ref} className="chord-timeline" style={{ height: `${laneCount * 29 + 12}px` }} aria-label="Chords along the playback timeline">
    {labels.map((label, index) => <React.Fragment key={index}>
      <span aria-hidden="true" className={`chord-tick ${index === activeIndex ? 'active' : ''}`} style={{ left: `${label.startX}px`, height: `${label.lane * 29 + 10}px` }} />
      <button type="button" disabled={disabled} className={`timeline-chord ${index === activeIndex ? 'active' : ''}`} style={{ color: colorAt(index), left: `${label.x}px`, top: `${label.lane * 29 + 9}px`, width: `${label.size}px` }} onClick={() => onSeek(timeline.events[index].start)} aria-current={index === activeIndex ? 'step' : undefined} aria-label={`${label.label}, bar ${timeline.events[index].startBeat / (timeline.beatsPerBar || 4) + 1}, seek to ${timeline.events[index].start.toFixed(1)} seconds`} title={`${timeline.events[index].chord} · ${timeline.events[index].bars} ${timeline.events[index].bars === 1 ? 'bar' : 'bars'}`}>
        {label.label}
      </button>
    </React.Fragment>)}
  </div>;
}
