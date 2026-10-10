import { songsById } from '../data/songs.js';

export function chartTarget(songId, event) {
  if (!event) return null;
  const song = songsById[songId];
  // Playback events carry explicit graph targets. Legacy callers can supply
  // the chord/section pair and resolve the same target from the song data.
  const match = Object.hasOwn(event, 'nodeId') ? event : song?.playback.find(item => item.chord === event.chord && (item.section || '') === (event.section || ''));
  return { node: match?.nodeId || 'unmapped' };
}
