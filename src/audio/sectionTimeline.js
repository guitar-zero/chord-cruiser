// Use graph sections so the progress bar matches the visible chart panels.
export function sectionTimeline(timeline, song) {
  const nodes = new Map(song.nodes.map(node => [node.id, node]));
  const sections = new Map(song.layout.sections.map((section, index) => [section.id, { ...section, number: index + 1 }]));
  const segments = [];
  for (const event of timeline.events) {
    const sectionId = nodes.get(event.nodeId)?.section || (sections.has(event.section) ? event.section : segments.at(-1)?.id) || song.layout.sections[0]?.id;
    const previous = segments.at(-1);
    if (previous?.id === sectionId) {
      previous.end = event.start + event.duration;
    } else {
      const section = sections.get(sectionId);
      segments.push({ id: sectionId, start: event.start, end: event.start + event.duration, label: `Section ${section?.number || segments.length + 1}${section?.title ? ` · ${section.title}` : ''}` });
    }
  }
  return segments;
}
