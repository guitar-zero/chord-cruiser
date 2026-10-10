import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import SongChart from './SongChart.jsx';

const ChartSections = forwardRef(function ChartSections({ song, currentChord, darkMode, suppressIndicator, hideGuidingLines, columns = 2 }, forwardedRef) {
  const svgRefs = useRef({});
  const activeSection = song.nodes.find(node => node.id === currentChord?.node)?.section;
  useImperativeHandle(forwardedRef, () => svgRefs.current[activeSection] || svgRefs.current[song.layout.sections[0].id]);
  return <div className="chart-sections" aria-label="All chord chart sections" style={{ '--chart-columns': columns, columnGap: columns === 2 ? '12px' : undefined }}>
    {song.layout.sections.map((section,index) => <section key={section.id} className="chart-section" aria-label={`${index+1} of ${song.layout.sections.length}: ${section.title || 'Chord progression'}`}>
      <p className="panel-caption">{activeSection === section.id ? 'Current section' : 'Section'} · {index+1} / {song.layout.sections.length}</p>
      <div className="chart">
        <SongChart ref={element => { svgRefs.current[section.id] = element; }} song={song} suppressIndicator={suppressIndicator} hideGuidingLines={hideGuidingLines} sectionId={section.id} darkMode={darkMode} currentChord={activeSection === section.id ? currentChord : null} showStartMarker={!currentChord && index === 0} />
      </div>
    </section>)}
  </div>;
});

export default ChartSections;
