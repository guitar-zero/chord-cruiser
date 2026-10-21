import React, { useEffect, useRef, useImperativeHandle, forwardRef, memo } from 'react';
import { curvePoint, sampleCurve, pointAtDistance, wakeOpacity, restingSpot, routesOverlap } from './animation/cruiserMotion.js';
import { routePalette } from './data/routePalette.js';

const travelArea = { width: 480, height: 320 };
const randomPoint = () => ({ x: 24 + Math.random() * 432, y: 24 + Math.random() * 272 });
const starts = [{ x: 24, y: 24 }, { x: 456, y: 160 }, { x: 200, y: 296 }];

function CruiserShip({ paused = false }, controlRef) {
  const indicator = useRef([]);
  const canvas = useRef(null);
  const shipEmoji = useRef(null);
  const speedMultiplier = useRef(1);
  const pausedRef = useRef(paused);
  const refreshAnimation = useRef(null);
  useImperativeHandle(controlRef, () => ({
    pauseImmediately() {
      pausedRef.current = true;
      refreshAnimation.current?.();
    },
  }), []);
  useEffect(() => {
    const surface = canvas.current;
    const context = surface.getContext('2d');
    if (!context) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame, lastFrame = null, time = 0, inView = true;
    let scaleX = 1, scaleY = 1;
    let ship = { x: 240, y: 160, rx: 110, ry: 75 };
    const boats = starts.map(start => ({
      to: start, control: null, samples: null, began: 0, duration: 0, count: 0,
      currentPoint: null, facing: 1, wake: [], nextSample: 0, lastPoint: null,
    }));
    function resize() {
      const bounds = shipEmoji.current.getBoundingClientRect();
      const viewport = surface.getBoundingClientRect();
      if (!viewport.width || !viewport.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.round(viewport.width * ratio);
      surface.height = Math.round(viewport.height * ratio);
      scaleX = surface.width / travelArea.width;
      scaleY = surface.height / travelArea.height;
      ship = {
        x: (bounds.left + bounds.width / 2 - viewport.left) * travelArea.width / viewport.width,
        y: (bounds.top + bounds.height / 2 - viewport.top) * travelArea.height / viewport.height,
        rx: bounds.width * .5 * travelArea.width / viewport.width + 12,
        ry: bounds.height * .32 * travelArea.height / viewport.height + 12,
      };
    }
    function nextCurve(boat) {
      const from = boat.to;
      const avoidShip = Math.random() < .8;
      const others = boats.filter(other => other !== boat).map(other => other.samples || [{ ...other.to, distance: 0 }]);
      let best;
      for (let attempt = 0; attempt < 100; attempt++) {
        const first = boat.control && attempt < 12
          ? { x: Math.max(24, Math.min(456, 2 * from.x - boat.control.x)), y: Math.max(24, Math.min(296, 2 * from.y - boat.control.y)) }
          : randomPoint();
        const to = randomPoint(), second = randomPoint();
        if (Math.hypot(to.x - from.x, to.y - from.y) < 65) continue;
        const curve = { from, first, second, to };
        const samples = sampleCurve(curve);
        if (others.some(route => routesOverlap(samples, route))) continue;
        let overlap = 0;
        if (avoidShip) {
          for (let step = 1; step <= 32; step++) {
            const point = curvePoint(curve, step / 32);
            if (((point.x - ship.x) / ship.rx) ** 2 + ((point.y - ship.y) / ship.ry) ** 2 < 1) overlap++;
          }
        }
        if (!best || overlap < best.overlap) best = { ...curve, samples, overlap };
        if (overlap === 0) break;
      }
      boat.began += boat.duration;
      if (best) {
        boat.to = best.to;
        boat.control = best.second;
        boat.samples = best.samples;
        boat.duration = boat.samples.at(-1).distance / 85 * 1000;
        boat.color = routePalette[(boat.count++ + boats.indexOf(boat) * 3) % routePalette.length];
      } else {
        // Yield in place until there is a route clear of the other boats.
        boat.samples = [{ ...from, distance: 0 }, { ...from, distance: 0 }];
        boat.control = null;
        boat.duration = 500;
      }
    }
    function advance(boat, at) {
      while (!boat.samples || at >= boat.began + boat.duration) nextCurve(boat);
      const point = pointAtDistance(boat.samples, (at - boat.began) * .085);
      boat.currentPoint = point;
      return point;
    }
    function animate(now) {
      time += lastFrame === null ? 0 : (now - lastFrame) * speedMultiplier.current;
      lastFrame = now;
      const batches = new Map();
      boats.forEach((boat, index) => {
        // Fixed-time wake samples preserve the trail through delayed frames.
        while (boat.nextSample <= time) {
          const point = advance(boat, boat.nextSample);
          if (boat.lastPoint && boat.color && Math.hypot(point.x - boat.lastPoint.x, point.y - boat.lastPoint.y) > .01) boat.wake.push({ from: boat.lastPoint, to: point, born: boat.nextSample, color: boat.color });
          boat.lastPoint = point;
          boat.nextSample += 40;
        }
        const point = advance(boat, time);
        const pulse = .43125 * (1 + .28 * Math.exp(-((time % 500) / 90)));
        if (Math.abs(point.dx) > .05) boat.facing = point.dx > 0 ? 1 : -1;
        const tilt = Math.max(-40, Math.min(40, Math.atan2(point.dy, Math.abs(point.dx)) * 180 / Math.PI * boat.facing));
        indicator.current[index]?.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${tilt}) scale(${pulse * boat.facing} ${pulse})`);
        while (boat.wake.length && time - boat.wake[0].born >= 10000) boat.wake.shift();
        const addStroke = (from, to, color, alpha) => {
          const opacity = Math.round(alpha * 20) / 20;
          if (!opacity) return;
          const key = `${color}:${opacity}`;
          if (!batches.has(key)) batches.set(key, { color, opacity, path: new Path2D() });
          const path = batches.get(key).path;
          path.moveTo(from.x, from.y);
          path.lineTo(to.x, to.y);
        };
        boat.wake.forEach(part => addStroke(part.from, part.to, part.color, wakeOpacity(time - part.born)));
        if (boat.lastPoint && boat.color) addStroke(boat.lastPoint, point, boat.color, 1);
      });
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, surface.width, surface.height);
      context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      context.lineCap = 'round';
      batches.forEach(({ color, opacity, path }) => {
        context.strokeStyle = color;
        context.lineWidth = 18;
        context.globalAlpha = opacity * .24;
        context.stroke(path);
        context.lineWidth = 6;
        context.globalAlpha = opacity * .65;
        context.stroke(path);
      });
      frame = requestAnimationFrame(animate);
    }
    function updateRunning() {
      cancelAnimationFrame(frame);
      lastFrame = null;
      if (pausedRef.current) {
        const departures = [];
        const occupied = [];
        boats.forEach((boat, index) => {
          const point = boat.currentPoint || advance(boat, time);
          indicator.current[index]?.setAttribute('transform', `translate(${point.x} ${point.y}) scale(${.43125 * boat.facing} .43125)`);
          const destination = restingSpot(point, occupied, ship);
          occupied.push(destination);
          if (destination === point) return;
          const facing = destination.x === point.x ? boat.facing : destination.x > point.x ? 1 : -1;
          departures.push({ index, from: point, to: destination, facing });
          // Resume cruising from the resting spot, without a connecting trail.
          Object.assign(boat, { to: destination, currentPoint: destination, samples: null, control: null, began: time, duration: 0, nextSample: time, lastPoint: null, facing });
        });
        if (departures.length) {
          let began;
          function moveClear(now) {
            began ??= now;
            const progress = preference.matches ? 1 : Math.min(1, (now - began) / 650);
            const eased = 1 - (1 - progress) ** 2;
            departures.forEach(({ index, from, to, facing }) => {
              indicator.current[index]?.setAttribute('transform', `translate(${from.x + (to.x - from.x) * eased} ${from.y + (to.y - from.y) * eased}) scale(${.43125 * facing} .43125)`);
            });
            if (progress < 1) frame = requestAnimationFrame(moveClear);
          }
          if (document.hidden || !inView || preference.matches) {
            departures.forEach(({ index, to, facing }) => indicator.current[index]?.setAttribute('transform', `translate(${to.x} ${to.y}) scale(${.43125 * facing} .43125)`));
          } else frame = requestAnimationFrame(moveClear);
        }
      }
      if (!pausedRef.current && !preference.matches && !document.hidden && inView) frame = requestAnimationFrame(animate);
    }
    refreshAnimation.current = updateRunning;
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(surface);
    resizeObserver.observe(shipEmoji.current);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updateRunning();
    });
    visibilityObserver.observe(surface);
    preference.addEventListener('change', updateRunning);
    document.addEventListener('visibilitychange', updateRunning);
    resize();
    updateRunning();
    return () => {
      refreshAnimation.current = null;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      preference.removeEventListener('change', updateRunning);
      document.removeEventListener('visibilitychange', updateRunning);
    };
  }, []);
  useEffect(() => {
    pausedRef.current = paused;
    refreshAnimation.current?.();
  }, [paused]);
  return <span className="cruiser-brand-ship" aria-hidden="true">
    <canvas ref={canvas} className="cruiser-ship-paths" />
    <span ref={shipEmoji} className="cruiser-ship-emoji"
      onPointerDown={event => {
        if (event.button !== 0) return;
        speedMultiplier.current = 3;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={() => { speedMultiplier.current = 1; }}
      onPointerCancel={() => { speedMultiplier.current = 1; }}
      onLostPointerCapture={() => { speedMultiplier.current = 1; }}
    >
      🛳️
      <span className="cruiser-window-glint" aria-hidden="true" />
      <span className="cruiser-window-glint cruiser-window-glint-later" aria-hidden="true" />
      <span className="cruiser-smoke" aria-hidden="true">
        <span className="cruiser-smoke-puff" />
        <span className="cruiser-smoke-puff" />
        <span className="cruiser-smoke-puff" />
      </span>
    </span>
    <svg className="cruiser-ship-paths cruiser-ship-overlay" viewBox="0 0 480 320" fill="none">
      {starts.map((start, index) => <g key={index} ref={node => { indicator.current[index] = node; }} transform={`translate(${start.x} ${start.y}) scale(.43125)`}>
        <g className={paused ? 'cruiser-boat-resting' : undefined} style={{ animationDelay: `${-index * .8}s` }}>
        <text fill="var(--ink)" textAnchor="middle" dominantBaseline="central" fontSize="64" fontFamily="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" transform="translate(-10 -16) rotate(-65)">🎸</text>
        <text className="cruiser-speedboat" fill="var(--ink)" textAnchor="middle" dominantBaseline="central" fontSize="100" fontFamily="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" transform="scale(-1 1)">🚤</text>
        </g>
      </g>)}
    </svg>
  </span>;
}

export default memo(forwardRef(CruiserShip));
