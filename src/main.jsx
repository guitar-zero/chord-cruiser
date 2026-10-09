import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TakeTheATrain from '../TakeTheATrain.jsx';
import AutumnLeaves from '../AutumnLeaves.jsx';
import Solar from '../Solar.jsx';
import './style.css';
import ChordPlayer from './ChordPlayer.jsx';
import { chartTarget } from './audio/chartTarget.js';

const routes = [
  { title: 'Chorus · first pass', chords: ['C6', 'D7', 'Dm', 'G7', 'C6'], note: 'Follow the solid arrows.', kind: 'solid' },
  { title: 'Chorus · second pass', chords: ['C6', 'Dm', 'G7'], note: 'Follow the dotted arrows, then move to the verse.', kind: 'dotted' },
  { title: 'Verse', chords: ['F6', 'D7', 'Dm', 'G7'], note: 'Return to the chorus after G7.', kind: 'solid' },
];

function App() {
  const [song, setSong] = useState('solar');
  const [playback, setPlayback] = useState(null);
  const currentChord = chartTarget(song, playback?.song === song ? playback.event : null);
  const autumn = song === 'autumn-leaves';
  const solar = song === 'solar';
  const title = solar ? 'Solar' : autumn ? 'Autumn Leaves' : 'Take the A Train';
  const visibleRoutes = solar ? [
    { title: '12-bar progression', chords: ['Cm', 'Gm', 'C7', 'F', 'Fm', 'B♭7', 'E♭', 'E♭m', 'A♭7', 'D♭', 'D°', 'G7'], note: 'Follow nodes 1–12. Bars 2 and 6 hold the preceding chord.', kind: 'solid' },
  ] : autumn ? [
    { title: 'Opening progression', chords: ['Dm', 'G7', 'C', 'F', 'B°', 'E7', 'Am'], note: 'Start at the boxed Dm and follow the numbered arrows.', kind: 'solid' },
  ] : routes;
  return (
    <main>
      <header>
        <div><p className="eyebrow">CHORD PATHS</p><h1>{title}</h1><p className="subtitle">{solar ? 'In C minor' : 'In C'} · {solar ? 'Frets 8–11' : autumn ? 'Frets 7–10' : 'Follow the movement'}</p></div>
        <a className="download" href={`/${song}.svg`} download>Download SVG <span aria-hidden="true">↗</span></a>
      </header>
      <nav className="songs" aria-label="Choose a song">
        {[['autumn-leaves', 'Autumn Leaves'], ['take-the-a-train', 'Take the A Train'], ['solar', 'Solar']].map(([value, label]) => <button key={value} type="button" aria-pressed={song === value} onClick={() => setSong(value)}>{label}</button>)}
      </nav>
      <ChordPlayer key={song} song={song} onChordChange={setPlayback} />
      <div className="layout">
        <section className="chart" aria-label="Chord movement chart">{solar ? <Solar currentChord={currentChord} /> : autumn ? <AutumnLeaves currentChord={currentChord} /> : <TakeTheATrain currentChord={currentChord} />}</section>
        <aside aria-label="Chord sequences">
          <h2>The chord routes</h2>
          {visibleRoutes.map(route => (
            <section className="route" key={route.title}>
              <h3><span className={`line ${route.kind}`} aria-hidden="true" />{route.title}</h3>
              <p className="chords" aria-label={route.chords.join(' to ')}>{route.chords.map((chord, index) => <React.Fragment key={index}>{index > 0 && <span className="arrow" aria-hidden="true">→</span>}<span>{chord}</span></React.Fragment>)}</p>
              <p className="note">{route.note}</p>
            </section>
          ))}
          {solar ? <p className="tip"><strong>One node per chord.</strong> Cm/C7, F/Fm, Gm/G7, and E♭/E♭m share root positions. D° represents Dm7♭5.</p> : autumn ? <p className="tip"><strong>Roots on the fretboard.</strong> Dm starts on fret 10 of the low E string. B° represents the simplified half-diminished chord.</p> : <p className="tip"><strong>Same root, different chord.</strong> D7 → Dm changes chord quality while the root stays in place.</p>}
        </aside>
      </div>
      <footer>A movement map based on {solar ? <a href="https://standardrepertoire.com/solar.html" target="_blank" rel="noreferrer">the Solar chart</a> : 'your card'}. {solar ? 'Chord names are simplified; duration labels show holds and split bars.' : autumn ? 'Opening excerpt transposed from B♭ to C with simplified chord names.' : 'Duration labels show holds and split bars; unlabelled nodes last one bar.'}</footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
