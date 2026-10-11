import React from 'react';
export default function PageNavigation({current}) {
  return <nav className="page-navigation" aria-label="Pages"><a href="/" aria-current={current==='chords'?'page':undefined}>Chord navigator</a><a href="/tabs" aria-current={current==='tabs'?'page':undefined}>Tab navigator</a></nav>;
}
