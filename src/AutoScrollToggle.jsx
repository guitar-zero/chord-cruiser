import React from 'react';

export default function AutoScrollToggle({ enabled, onToggle }) {
  return <button className="theme-toggle" type="button" aria-keyshortcuts="b" title="Toggle auto scroll (B)" aria-pressed={enabled} onClick={onToggle}>
    Auto scroll <kbd>B</kbd>
  </button>;
}
