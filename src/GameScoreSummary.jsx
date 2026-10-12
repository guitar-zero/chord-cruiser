import React from 'react';

export default function GameScoreSummary({ score }) {
  return <div className="game-score-summary">
    {[['Accuracy', score.chord, '✦'], ['Timing', score.timing, '♫']].map(([label, points, symbol]) => {
      const percent = score.judged ? Math.round(points / (score.judged * 100) * 100) : null;
      return <div className="game-score-meter" key={label} aria-label={`${label}: ${percent === null ? 'no attempts yet' : `${percent}% overall`}`}>
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="33" className="game-score-ring-track" />
          <circle cx="40" cy="40" r="33" className="game-score-ring-fill" pathLength="100" strokeDasharray={`${percent || 0} 100`} transform="rotate(-90 40 40)" />
          <text x="40" y="32" textAnchor="middle" className="game-score-symbol">{symbol}</text>
          <text x="40" y="54" textAnchor="middle" className="game-score-percent">{percent === null ? '—' : `${percent}%`}</text>
        </svg>
        <strong>{label}</strong>
      </div>;
    })}
    <span className="game-score-attempts">{score.judged} {score.judged === 1 ? 'chord' : 'chords'} judged</span>
  </div>;
}
