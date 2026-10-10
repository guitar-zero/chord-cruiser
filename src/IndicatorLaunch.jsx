import React, { useEffect, useState } from 'react';

export default function IndicatorLaunch({ flight, onComplete }) {
  const [position,setPosition]=useState(null);
  useEffect(()=>{
    if(!flight) { setPosition(null); return; }
    let frame,started;
    const animate=time=>{
      started ??= time;
      const t=Math.min(1,(time-started)/650);
      const x=flight.from.x+(flight.to.x-flight.from.x)*t;
      const y=flight.from.y+(flight.to.y-flight.from.y)*t-4*t*(1-t)*Math.min(180,Math.abs(flight.to.x-flight.from.x)*.2+100);
      setPosition({x,y,size:28+(flight.size-28)*t});
      if(t<1) frame=requestAnimationFrame(animate); else onComplete();
    };
    frame=requestAnimationFrame(animate);
    return ()=>cancelAnimationFrame(frame);
  },[flight,onComplete]);
  if(!flight || !position) return null;
  const path=Array.from({length:193},(_,i)=>{
    const a=i/192*Math.PI*2,r=42+5*Math.cos(a*8);
    return `${i?'L':'M'}${50+Math.cos(a)*r} ${50+Math.sin(a)*r}`;
  }).join(' ')+' Z';
  return <svg aria-hidden="true" viewBox="0 0 100 100" style={{position:'fixed',left:position.x-position.size/2,top:position.y-position.size/2,width:position.size,height:position.size,pointerEvents:'none',zIndex:1000,overflow:'visible',filter:'drop-shadow(0 3px 5px #c91b9855)'}}>
    <path d={path} fill="#e534ae" fillOpacity=".09" stroke="#e534ae" strokeWidth="12" strokeOpacity=".18" />
    <path d={path} fill="none" stroke="#e534ae" strokeWidth="4" />
  </svg>;
}
