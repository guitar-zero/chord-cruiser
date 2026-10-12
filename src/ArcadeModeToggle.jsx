import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Keep the invitation dismissed across player remounts when songs change.
let hasOpenedArcade = false;

export default function ArcadeModeToggle({ enabled, onToggle }) {
  const [dock, setDock] = useState(null);
  const [hasClicked, setHasClicked] = useState(hasOpenedArcade);
  useLayoutEffect(() => { setDock(document.getElementById('arcade-mode-dock')); }, []);
  const button = <div className="game-mode-toggle"><button className={!hasClicked && !enabled ? 'arcade-invitation' : undefined} type="button" aria-pressed={enabled} onClick={() => { hasOpenedArcade = true; setHasClicked(true); onToggle(); }}><span aria-hidden="true">✦ ♫ ✦</span><strong>{enabled ? 'EXIT THE ARCADE' : 'GUITAR ARCADE'}</strong><small>{enabled ? 'Back to chord practice' : 'Enter game mode · play your guitar'}</small></button></div>;
  return dock ? createPortal(button, dock) : button;
}
