import React from 'react';

export default function AutoScrollToggle({ enabled, onToggle }) {
  return <button type="button" aria-pressed={!enabled} onClick={onToggle}>
    {enabled ? 'Disable auto scrolling' : 'Enable auto scrolling'}
  </button>;
}
