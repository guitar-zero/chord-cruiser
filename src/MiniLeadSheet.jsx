import React, { useEffect, useMemo, useRef } from 'react';
import { leadSheetSections } from './data/leadSheet.js';
import { timelineColor } from './data/timelinePresentation.js';

const chordLabel = chord => chord.replaceAll('maj7', 'Δ7').replaceAll('b', '♭').replaceAll('#', '♯');

export default function MiniLeadSheet({ timeline, position, colors, darkMode, disabled, onSeek }) {
  const sections = useMemo(() => leadSheetSections(timeline), [timeline]);
  const ref = useRef(null);
  const activeBar = Math.floor(position / timeline.duration * timeline.beats / timeline.beatsPerBar) + 1;
  useEffect(() => {
    const container = ref.current;
    const current = container?.querySelector('[aria-current="step"]');
    if (!current) return;
    const a = container.getBoundingClientRect(), b = current.getBoundingClientRect();
    if (b.top < a.top || b.bottom > a.bottom) container.scrollTop += b.top - a.top - container.clientHeight / 2 + b.height / 2;
  }, [activeBar]);
  return <div className="mini-lead-sheet" ref={ref} role="region" aria-label="Full chord chart" tabIndex="0">
    {sections.map((section, sectionIndex) => <section key={sectionIndex} className="lead-sheet-section">
      <h3>{section.label || 'Chord chart'}</h3>
      <div className="lead-sheet-measures">
        {section.measures.map(measure => <div key={measure.number} className="lead-sheet-measure" data-repeat={measure.repeat || undefined}>
          <span className="lead-sheet-bar-number" aria-hidden="true">{measure.number}</span>
          {measure.parts.map((part, i) => {
            const active = position >= part.start && position < part.end;
            const color = timelineColor(colors?.[part.eventIndex], darkMode);
            return <button key={i} type="button" disabled={disabled} onClick={() => onSeek(part.start)}
              aria-current={active ? 'step' : undefined}
              aria-label={`Bar ${measure.number}, ${part.chord}${measure.repeat ? ', repeated bar' : ''}, seek to ${part.start.toFixed(1)} seconds`}
              title={`${part.chord} · bar ${measure.number}${part.bars < 1 ? ` · ${part.bars === .5 ? 'half-bar' : `${part.bars} bar`}` : ''}`}
              style={{ '--chord-color': color || 'var(--ink)', flexGrow: part.bars }}>
              <span>{measure.repeat ? (measure.parts.length === 1 ? '%' : i === 0 ? '%' : '·') : chordLabel(part.chord)}</span>
              {measure.repeat && <small>{chordLabel(part.chord)}</small>}
            </button>;
          })}
        </div>)}
      </div>
    </section>)}
  </div>;
}
