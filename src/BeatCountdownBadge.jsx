import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { beatCountdown } from './audio/pipeProgress.js';

export default function BeatCountdownBadge({ x, y, color, darkMode, visitIndex, playbackClockRef, numberOnly = false }) {
  const pulseRef=useRef(null);
  const anchorRef=useRef(null);
  const overlayRef=useRef(null);
  const [beatsLeft,setBeatsLeft]=useState(()=>beatCountdown(playbackClockRef?.current).beatsLeft);
  useEffect(()=>{
    let frame;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let launchedAt;
    let sourceAnchor;
    function update(now) {
      const matrix=anchorRef.current?.getScreenCTM();
      if(matrix && overlayRef.current) {
        if (launchedAt === undefined) {
          launchedAt = now;
          sourceAnchor = numberOnly && !reduced ? document.querySelector('[data-beat-anchor="current"]') : null;
        }
        const sourceMatrix = sourceAnchor?.getScreenCTM();
        const progress = sourceMatrix ? Math.min(1, Math.max(0, (now - launchedAt) / 200)) : 1;
        const mix = key => sourceMatrix ? sourceMatrix[key] + (matrix[key] - sourceMatrix[key]) * progress : matrix[key];
        overlayRef.current.setAttribute('transform',`matrix(${mix('a')} ${mix('b')} ${mix('c')} ${mix('d')} ${mix('e')} ${mix('f')})`);
        overlayRef.current.style.visibility='visible';
      }
      const clock=playbackClockRef?.current;
      if(clock?.visitIndex===visitIndex) {
        const {beatsLeft,phase}=beatCountdown(clock);
        setBeatsLeft(beatsLeft);
        pulseRef.current?.setAttribute('transform',`scale(${reduced ? 1 : 1+.12*Math.exp(-phase*8)})`);
      }
      frame=requestAnimationFrame(update);
    }
    frame=requestAnimationFrame(update);
    return ()=>cancelAnimationFrame(frame);
  },[playbackClockRef,visitIndex,numberOnly]);
  const label=`${beatsLeft} ${beatsLeft===1?'beat':'beats'}`;
  const urgent = (playbackClockRef?.current?.beats || 0) > 0 && playbackClockRef.current.beats < 2;
  const badgeColor = urgent ? (darkMode ? '#ff6259' : '#d62828') : color;
  return <><g data-chart-label="true" data-chart-label-above="true" aria-label={`${label} until chord change`} pointerEvents="none">
    <g ref={anchorRef} data-beat-anchor={numberOnly ? 'destination' : 'current'} transform={`translate(${x} ${y})`}>
      <rect x="-62" y="-24" width="124" height="48" fill="none" stroke="none" />
    </g>
  </g>{createPortal(<svg aria-hidden="true" style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',overflow:'visible',zIndex:1400}}>
    <g ref={overlayRef} style={{visibility:'hidden'}}>
      <g ref={pulseRef}>
        <rect x="-55" y="-20" width="110" height="40" rx="20" fill={badgeColor} />
        <text x="0" y="7" textAnchor="middle" fill="#ffffff" style={{fill:darkMode?'#073840':'#ffffff'}} fontFamily="system-ui, sans-serif" fontSize="21" fontWeight="700">{numberOnly ? `${beatsLeft}...` : label}</text>
      </g>
    </g>
  </svg>,document.body)}</>;
}
