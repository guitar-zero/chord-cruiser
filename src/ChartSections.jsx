import React, { forwardRef, useImperativeHandle, useRef, useMemo } from "react";
import SongChart, { outgoingVisitColors } from "./SongChart.jsx";
import SectionBeatDots from './SectionBeatDots.jsx';
import { chordDisplayColors } from './data/chordQualityColors.js';

const ChartSections = forwardRef(function ChartSections(
  {
    song,
    currentChord,
    playbackClockRef,
    onIndicatorArrival,
    darkMode,
    suppressIndicator,
    hideGuidingLines,
    hideOtherNodes,
    columns = 2,
  },
  forwardedRef,
) {
  const svgRefs = useRef({});
  const visitColors = useMemo(() => chordDisplayColors(song, outgoingVisitColors(song)), [song]);
  const activeSection = song.nodes.find(
    (node) => node.id === currentChord?.node,
  )?.section;
  const nextEvent = currentChord && song.playback[(currentChord.visitIndex + 1) % song.playback.length];
  const nextSection = song.nodes.find(node => node.id === nextEvent?.nodeId)?.section || nextEvent?.section || activeSection;
  useImperativeHandle(
    forwardedRef,
    () =>
      svgRefs.current[activeSection] ||
      svgRefs.current[song.layout.sections[0].id],
  );
  return (
    <div
      className={`chart-sections${currentChord?.isPlaying ? " is-playing" : ""}`}
      aria-label="All chord chart sections"
      style={{
        "--chart-columns": columns,
        columnGap: columns === 2 ? "12px" : undefined,
      }}
    >
      {song.layout.sections.map((section, index) => (
        <section
          key={section.id}
          className="chart-section"
          aria-label={`${index + 1} of ${song.layout.sections.length}: ${section.title || "Chord progression"}`}
        >
          <div className="section-beat-gap">
            {(activeSection === section.id || nextSection === section.id) && <SectionBeatDots playbackClockRef={playbackClockRef} visible={Boolean(currentChord)} song={song} colors={visitColors} darkMode={darkMode} visitIndex={currentChord?.visitIndex} isPlaying={currentChord?.isPlaying} />}
          </div>
          <p className="panel-caption">
            <span>
              {activeSection === section.id ? "Current section" : "Section"} ·{" "}
              {index + 1} / {song.layout.sections.length}
            </span>
            {section.title && (
              <span
                className="panel-section-title"
                aria-current={activeSection === section.id ? "step" : undefined}
              >
                {section.title}
              </span>
            )}
          </p>
          <div className="chart">
            <SongChart
              ref={(element) => {
                svgRefs.current[section.id] = element;
              }}
              song={song}
              onIndicatorArrival={onIndicatorArrival}
              playbackClockRef={playbackClockRef}
              suppressIndicator={suppressIndicator}
              hideGuidingLines={hideGuidingLines}
              hideOtherNodes={hideOtherNodes}
              sectionId={section.id}
              playbackVisitIndex={currentChord?.visitIndex}
              playbackIsPlaying={currentChord?.isPlaying}
              darkMode={darkMode}
              currentChord={activeSection === section.id ? currentChord : null}
              showStartMarker={!currentChord && index === 0}
            />
          </div>
        </section>
      ))}
    </div>
  );
});

export default ChartSections;
