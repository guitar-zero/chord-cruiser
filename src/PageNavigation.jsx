import React from 'react';
import { pageHref } from './data/pageRouting.js';
export default function PageNavigation({current}) {
  return <nav className="page-navigation" aria-label="Pages"><a href={pageHref('chords', import.meta.env.BASE_URL)} aria-current={current==='chords'?'page':undefined}>Chord navigator</a><a href={pageHref('tabs', import.meta.env.BASE_URL)} aria-current={current==='tabs'?'page':undefined}>Tab navigator</a></nav>;
}
