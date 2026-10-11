import React from 'react';

const symbols = { Perfect: '✦', Great: '★', Good: '♪', Okay: '♡', Nope: '×' };

export function GameMiss({ attempt }) {
  return <div key={attempt} className="game-judgment game-miss" data-grade="Nope"><strong className="game-judgment-word">MISS!</strong></div>;
}

export default function GameJudgment({ kind, grade, attempt }) {
  return <div key={`${attempt}:${kind}:${grade}`} className="game-judgment" data-grade={grade || 'Listening'}>
    <span className="game-judgment-kind">{kind}</span>
    <strong className="game-judgment-word"><span aria-hidden="true">{symbols[grade] || '·'}</span> {grade || 'Listening…'} <span aria-hidden="true">{symbols[grade] || '·'}</span></strong>
    {grade === 'Perfect' && <span className="game-judgment-sparkles" aria-hidden="true">✧ · ✦ · ✧</span>}
  </div>;
}
