export function shortcutKey(event) {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  if (event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return null;
  return event.key?.toLowerCase();
}

export function tempoShortcut(event, playbackState, songLoading = false) {
  if (playbackState !== 'stopped' || songLoading) return null;
  const key = shortcutKey(event);
  if (!/^[0-9]$/.test(key ?? '')) return null;
  const digit = Number(key);
  return digit < 4 ? 100 + digit * 10 : digit * 10;
}
