// Consecutive copies of a progression share the first board. Playback keeps
// every event and its source section label, so pass numbers and timing survive.
export function repeatIdenticalSections(song) {
  const byId = new Map(song.nodes.map(node => [node.id, node]));
  const events = section => {
    const indices = song.playback.flatMap((event, index) => byId.get(event.nodeId)?.section === section.id ? [index] : []);
    if (!indices.length) return [];
    const sequence = song.playback.slice(indices[0], indices.at(-1) + 1);
    // Leave already-reused sections and unmapped source chords intact.
    return sequence.every(event => byId.get(event.nodeId)?.section === section.id) ? sequence : [];
  };
  const remap = new Map();
  const removed = new Set();
  const titles = new Map();
  let previous;
  for (const section of song.layout.sections) {
    const currentEvents = events(section);
    const previousEvents = previous && events(previous);
    const mapping = new Map();
    const matches = previousEvents?.length === currentEvents.length && currentEvents.length > 0 && currentEvents.every((event, index) => {
      const prior = previousEvents[index];
      const node = byId.get(event.nodeId);
      const priorNode = byId.get(prior.nodeId);
      if (event.chord !== prior.chord || event.bars !== prior.bars || node.chord !== priorNode.chord) return false;
      if (mapping.has(node.id) && mapping.get(node.id) !== priorNode.id) return false;
      mapping.set(node.id, priorNode.id);
      return true;
    });
    // Require a one-to-one mapping of all nodes, including graph-only nodes.
    if (matches && new Set(mapping.values()).size === mapping.size && song.nodes.filter(node => node.section === section.id).length === mapping.size && song.nodes.filter(node => node.section === previous.id).length === mapping.size) {
      for (const [from, to] of mapping) remap.set(from, to);
      removed.add(section.id);
      titles.set(previous.id, `${titles.get(previous.id) || previous.title} / ${section.title}`);
    } else previous = section;
  }
  if (!removed.size) return song;
  const nodeId = id => remap.get(id) || id;
  return {
    ...song,
    startNodeId: nodeId(song.startNodeId),
    nodes: song.nodes.filter(node => !removed.has(node.section)).map((node, index) => ({ ...node, step: index + 1 })),
    edges: song.edges.filter(edge => !removed.has(edge.section)),
    playback: song.playback.map(event => ({ ...event, nodeId: nodeId(event.nodeId) })),
    durationLabels: song.durationLabels?.filter(label => !remap.has(label.nodeId)),
    routes: song.routes?.map(route => ({ ...route, nodeIds: route.nodeIds.map(nodeId) })),
    layout: { ...song.layout, sections: song.layout.sections.filter(section => !removed.has(section.id)).map(section => titles.has(section.id) ? { ...section, title: titles.get(section.id) } : section) },
  };
}
