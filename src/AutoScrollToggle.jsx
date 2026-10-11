import React from 'react';

export default function AutoScrollToggle({ enabled, onToggle }) {
  return <button className="theme-toggle" type="button" aria-keyshortcuts="a" title="Toggle auto scroll (A)" aria-pressed={enabled} onClick={onToggle}>
    Auto scroll <kbd>A</kbd>
  </button>;
}
