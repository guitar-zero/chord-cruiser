export function chordShape(chord) {
  const quality = chord.replace(/^[A-G][b#♭♯]?/, '');
  if (/dim|°|ø|m7b5/.test(quality)) return 'hexagon';
  if (/^m(?!aj)/.test(quality)) return 'triangle';
  if (/^7/.test(quality)) return 'square';
  return 'circle';
}

export function songNodeShapes(song) {
  return Object.fromEntries(song.nodes.map(node => {
    const source = song.playback.find(event => event.nodeId === node.id);
    return [node.id, chordShape(source?.chord || node.chord)];
  }));
}
