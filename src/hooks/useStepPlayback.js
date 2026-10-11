import { useEffect, useMemo, useRef, useState } from 'react';
import { buildTimeline } from '../audio/songs.js';

// A reusable practice clock for input that supplies steps but no musical rhythm.
export default function useStepPlayback(events, pace, loop) {
  const timeline=useMemo(()=>buildTimeline(events,pace,1),[events,pace]);
  const [position,setPosition]=useState(0),[playing,setPlaying]=useState(false);
  const [seekVersion,setSeekVersion]=useState(0),[loopIteration,setLoopIteration]=useState(0);
  const cursor=useRef(0),frame=useRef(null),clockRef=useRef(null);
  const previousTimeline=useRef(timeline);
  const index=Math.max(0,timeline.events.findIndex(event=>position>=event.start && position<event.start+event.duration));
  const active=position>=timeline.duration?timeline.events.at(-1):timeline.events[index];
  const activeIndex=timeline.events.indexOf(active);
  useEffect(()=>{setPlaying(false);cursor.current=0;setPosition(0);setSeekVersion(v=>v+1);},[events]);
  useEffect(()=>{
    if (previousTimeline.current !== timeline) {
      cursor.current = cursor.current / previousTimeline.current.duration * timeline.duration;
      previousTimeline.current = timeline;
    }
    cursor.current=Math.min(cursor.current,timeline.duration);
    setPosition(cursor.current);
    if(!playing) return;
    let last=performance.now();
    function tick(now) {
      cursor.current+=(now-last)/1000;last=now;
      if(cursor.current>=timeline.duration) {
        if(loop) {cursor.current%=timeline.duration;setLoopIteration(v=>v+1);setSeekVersion(v=>v+1);}
        else {cursor.current=timeline.duration;setPosition(cursor.current);setPlaying(false);return;}
      }
      setPosition(cursor.current);frame.current=requestAnimationFrame(tick);
    }
    frame.current=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame.current);
  },[playing,timeline,loop]);
  clockRef.current={visitIndex:activeIndex,seekVersion,loopIteration,position,beats:active?.beats||1,progress:active?Math.min(1,Math.max(0,(position-active.start)/active.duration)):0,bpm:pace};
  function seek(value) {cursor.current=Math.max(0,Math.min(timeline.duration,Number(value)));setPosition(cursor.current);setSeekVersion(v=>v+1);}
  function toggle() {if(!playing && cursor.current>=timeline.duration) seek(0);setPlaying(value=>!value);}
  function stop() {setPlaying(false);seek(0);}
  return {timeline,position,playing,active,activeIndex,seekVersion,loopIteration,clockRef,seek,toggle,stop};
}
