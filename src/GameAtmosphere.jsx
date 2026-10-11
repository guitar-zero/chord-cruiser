import React from 'react';
import { createPortal } from 'react-dom';

export default function GameAtmosphere({ playing }) {
  return createPortal(<div className={`game-atmosphere${playing ? ' is-playing' : ''}`} aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} className="game-laser-bolt" style={{ '--bolt-index': index }} />)}</div>, document.body);
}
