import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import SongChart from './SongChart.jsx';
import { visibleSectionIndices, followSection } from './data/carousel.js';

const ChartCarousel = forwardRef(function ChartCarousel({ song, currentChord, darkMode }, forwardedRef) {
  const sections = song.layout.sections;
  const [index, setIndex] = useState(0);
  const touch = useRef(null);
  const svgRefs = useRef({});
  const lastSeek = useRef(currentChord?.seekVersion);
  const activeSection = song.nodes.find(node => node.id === currentChord?.node)?.section;
  const activeIndex = sections.findIndex(section => section.id === activeSection);
  const indices = visibleSectionIndices(index,sections.length);
  const activeSlot = indices.indexOf(activeIndex);
  useImperativeHandle(forwardedRef, () => svgRefs.current[activeSlot] || svgRefs.current[0]);
  useEffect(() => {
    const reset = lastSeek.current !== currentChord?.seekVersion;
    lastSeek.current = currentChord?.seekVersion;
    if (!currentChord) setIndex(0);
    else setIndex(start => followSection(start,activeIndex,sections.length,reset));
  }, [activeIndex, currentChord?.seekVersion, !currentChord, sections.length]);
  const move = delta => setIndex(value => (value + delta + sections.length) % sections.length);
  return <div className="section-carousel" role="region" aria-roledescription="carousel" aria-label="Chord chart sections" tabIndex="0" onKeyDown={event => {
    if (['SELECT','INPUT','TEXTAREA'].includes(event.target.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
  }}>
    {sections.length > 1 && <nav className="carousel-controls" aria-label="Section navigation">
      <button type="button" onClick={() => move(-1)} aria-label="Previous section">← Previous</button>
      <label>Section <select value={index} onChange={event => setIndex(Number(event.target.value))} aria-label="Choose chart section">
        {sections.map((item,i) => <option key={item.id} value={i}>{i+1}. {item.title || 'Chord progression'}</option>)}
      </select></label>
      <span className="carousel-position" aria-live="polite">{indices.map(i=>i+1).join(' + ')} / {sections.length}</span>
      <button type="button" onClick={() => move(1)} aria-label="Next section">Next →</button>
    </nav>}
    <div className="carousel-panels" onTouchStart={event => {
      const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY };
    }} onTouchEnd={event => {
      const point = event.changedTouches[0], start = touch.current; touch.current = null;
      if (start && Math.abs(point.clientX-start.x) > 50 && Math.abs(point.clientX-start.x) > Math.abs(point.clientY-start.y)) move(point.clientX < start.x ? 1 : -1);
    }} onTouchCancel={() => { touch.current = null; }}>
      {indices.map((sectionIndex,slot) => {
        const section = sections[sectionIndex];
        const nextLoop = slot === 1 && sectionIndex <= index;
        return <section key={`${section.id}:${slot}`} className="carousel-panel" role="group" aria-roledescription="slide" aria-label={`${sectionIndex+1} of ${sections.length}: ${section.title || 'Chord progression'}${nextLoop ? ', next loop' : ''}`}>
          <p className="panel-caption">{slot === activeSlot ? 'Current section' : nextLoop ? 'Next loop' : slot === 1 ? 'Up next' : 'Section'} · {sectionIndex+1} / {sections.length}</p>
          <div className="chart">
            <SongChart ref={element => { svgRefs.current[slot] = element; }} song={song} sectionId={section.id} darkMode={darkMode} currentChord={slot === activeSlot ? currentChord : null} showStartMarker={!currentChord && slot === 0} />
          </div>
        </section>;
      })}
    </div>
  </div>;
});

export default ChartCarousel;
