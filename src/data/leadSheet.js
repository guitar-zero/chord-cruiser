// Expand held chords into measures without creating new playback visits.
export function leadSheetSections(timeline) {
  const measures = Array.from({ length: Math.ceil(timeline.beats / timeline.beatsPerBar) }, (_, index) => ({ number: index + 1, parts: [] }));
  timeline.events.forEach((event, eventIndex) => {
    const start = event.startBeat / timeline.beatsPerBar;
    const end = start + event.bars;
    for (let bar = Math.floor(start); bar < Math.ceil(end); bar++) {
      const from = Math.max(start, bar), to = Math.min(end, bar + 1);
      if (to <= from) continue;
      measures[bar].parts.push({ eventIndex, chord: event.chord, section: event.section || '', bars: to - from, start: event.start + (from - start) / event.bars * event.duration, end: event.start + (to - start) / event.bars * event.duration });
    }
  });
  const sections = [];
  let previous;
  for (const measure of measures) {
    const label = measure.parts[0]?.section || '';
    let section = sections.at(-1);
    if (!section || section.label !== label) {
      section = { label, measures: [] };
      sections.push(section);
      previous = undefined;
    }
    measure.repeat = Boolean(previous && measure.parts.length === previous.parts.length && measure.parts.every((part, i) => part.chord === previous.parts[i].chord && Math.abs(part.bars - previous.parts[i].bars) < 1e-8));
    section.measures.push(measure);
    previous = measure;
  }
  return sections;
}
