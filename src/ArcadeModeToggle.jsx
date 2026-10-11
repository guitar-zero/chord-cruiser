import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ArcadeModeToggle({ enabled, onToggle }) {
  const [dock, setDock] = useState(null);
  useLayoutEffect(() => { setDock(document.getElementById('arcade-mode-dock')); }, []);
  const button = <div className="game-mode-toggle"><button type="button" aria-pressed={enabled} onClick={onToggle}><span aria-hidden="true">✦ ♫ ✦</span><strong>{enabled ? 'EXIT THE ARCADE' : 'GUITAR ARCADE'}</strong><small>{enabled ? 'Back to chord practice' : 'Enter game mode · play your guitar'}</small></button></div>;
  return dock ? createPortal(button, dock) : button;
}
