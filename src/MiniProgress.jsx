import React, { useEffect, useReducer, useRef, useState } from "react";
import ProgressBar from "./ProgressBar.jsx";
import GameBar from './GameBar.jsx';
import ChordQualityLegend from "./ChordQualityLegend.jsx";
import MiniChordStrip from "./MiniChordStrip.jsx";
import ShellChordDiagram from "./ShellChordDiagram.jsx";
import { timelineColor } from "./data/timelinePresentation.js";
import { miniProgressState } from "./miniProgressState.js";
import { shortcutKey } from "./keyboardShortcuts.js";
import { popupPlacement } from './data/popupPlacement.js';

export default function MiniProgress({
  progressRef,
  chord,
  currentEvent,
  currentNode,
  nextEvent,
  nextNode,
  activeIndex,
  colors,
  darkMode,
  nodeLabels,
  neverShow,
  nodeColorMode,
  playbackState,
  onToggle,
  onStop,
  onOpenChordChart,
  chartOpen,
  showFullPath,
  showGuideLines,
  autoScrollEnabled,
  onToggleAutoScroll,
  onToggleFullPath,
  onToggleGuideLines,
  twoStrings,
  setTwoStrings,
  gameMode,
  gameHasStarted,
  gameReady,
  ...progressProps
}) {
  const [{ visible, dismissed }, dispatch] = useReducer(miniProgressState, {
    visible: true,
    dismissed: false,
  });
  const [manualOpen, setManualOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 600px)').matches);
  const dialogRef = useRef(null);
  const launcherRef = useRef(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const update = () => { setIsMobile(media.matches); setManualOpen(false); };
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  function closeMenu() {
    setManualOpen(false);
    dispatch({ type: 'dismiss' });
  }
  const [belowMainIndicator, setBelowMainIndicator] = useState(false);
  const automatic = !isMobile && (gameMode || (belowMainIndicator && !visible));
  const shouldShow = manualOpen || (automatic && !dismissed && !neverShow);
  useEffect(() => {
    if (!isMobile && belowMainIndicator && manualOpen) {
      setManualOpen(false);
      dispatch({ type: 'visibility', visible: true });
      dispatch({ type: 'visibility', visible: false });
    }
  }, [belowMainIndicator, manualOpen, isMobile]);
  useEffect(() => {
    function handleShortcut(event) {
      if (shortcutKey(event) !== "m") return;
      event.preventDefault();
      if (shouldShow) {
        setManualOpen(false);
        dispatch({ type: "dismiss" });
      } else setManualOpen(true);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [shouldShow]);
  const [mounted, setMounted] = useState(false);
  const popupRef = useRef(null);
  useEffect(() => {
    if (!mounted || isMobile) return;
    let frame;
    let placement;
    function measure() {
      const popup = popupRef.current;
      if (popup) {
        const obstacles = [...document.querySelectorAll('[data-playback-indicator], [data-game-judgment], .game-count-in-card')];
        const targetIds = new Set([...document.querySelectorAll('[data-highlight-target]')].map(element => element.dataset.highlightTarget));
        for (const node of document.querySelectorAll('[data-node-id]')) {
          if (node.getAttribute('aria-hidden') === 'true') continue;
          if (node.dataset.nextNode || targetIds.has(node.dataset.nodeId)) {
            const shape = node.querySelector('[data-node-shape]');
            if (shape) obstacles.push(shape);
          }
        }
        placement = popupPlacement(popup.parentElement.getBoundingClientRect(), document.documentElement.clientWidth, window.innerHeight, obstacles.map(element => element.getBoundingClientRect()), placement);
        popup.parentElement.dataset.side = placement.side;
        popup.parentElement.style.top = `${placement.top}px`;
      }
      frame = requestAnimationFrame(measure);
    }
    measure();
    return () => cancelAnimationFrame(frame);
  }, [mounted, isMobile]);
  useEffect(() => {
    if (shouldShow) {
      setMounted(true);
      return;
    }
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 180;
    const timer = setTimeout(() => setMounted(false), delay);
    return () => clearTimeout(timer);
  }, [shouldShow]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting && entry.intersectionRatio >= 1;
        setBelowMainIndicator(entry.boundingClientRect.bottom <= (entry.rootBounds?.top ?? 0));
        // Closing applies only to this excursion outside the main bar's view.
        dispatch({ type: "visibility", visible: inView });
      },
      { threshold: [0, 1] },
    );
    if (progressRef.current) observer.observe(progressRef.current);
    return () => observer.disconnect();
  }, [progressRef]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isMobile || !dialog) return;
    if (shouldShow && !dialog.open) dialog.showModal();
    else if (!shouldShow && dialog.open) { dialog.close(); launcherRef.current?.focus(); }
  }, [isMobile, mounted, shouldShow]);
  const PopupContainer = isMobile ? 'dialog' : 'div';
  return (
    <>
      {isMobile && <button ref={launcherRef} type="button" className="mobile-mini-menu-button" aria-label="Open playback menu" aria-haspopup="dialog" aria-expanded={shouldShow} onClick={() => setManualOpen(true)}>☰ <span>Menu</span></button>}
      {mounted && (
        <PopupContainer
          ref={isMobile ? dialogRef : undefined}
          className={isMobile ? 'mobile-mini-menu-modal' : 'mini-playback-toasts'}
          aria-label={isMobile ? 'Playback menu' : undefined}
          onCancel={isMobile ? event => { event.preventDefault(); closeMenu(); } : undefined}
          onClick={isMobile ? event => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeMenu();
          } : undefined}
          aria-hidden={!shouldShow || undefined}
          inert={!shouldShow}
        >
          <section
            ref={popupRef}
            className={`mini-progress-toast ${shouldShow ? "mini-progress-enter" : "mini-progress-exit"}`}
            aria-label="Mini playback progress"
            aria-hidden={!shouldShow || undefined}
            inert={!shouldShow}
          >
            {gameMode && <div className="game-banner"><strong>GUITAR GAME MODE</strong></div>}
            <div className="mini-progress-heading">
              <strong>{chord}</strong>
              <span>Bar {Math.min(Math.floor(progressProps.position / progressProps.timeline.duration * progressProps.timeline.beats / progressProps.timeline.beatsPerBar) + 1, Math.ceil(progressProps.timeline.beats / progressProps.timeline.beatsPerBar))}</span>
              <button type="button" className="mini-progress-close" autoFocus={isMobile} aria-label="Toggle mini menu" aria-keyshortcuts="m" title="Toggle mini menu (M)" onClick={closeMenu}>×</button>
            </div>
            {nodeColorMode === 'quality' && <ChordQualityLegend darkMode={darkMode} compact />}
            {gameMode && <strong>{gameHasStarted ? 'Next' : 'First chord'}</strong>}
            <ShellChordDiagram chord={(gameMode ? nextEvent : currentEvent)?.chord} node={gameMode ? nextNode : currentNode} color={timelineColor(colors?.[gameMode ? nextEvent?.index : activeIndex], darkMode)} darkMode={darkMode} />
            <div className="mini-view-controls mini-compact-controls">
              <button type="button" aria-label="Full path during playback" title="Full path during playback (X)" aria-pressed={showFullPath} aria-keyshortcuts="x" onClick={onToggleFullPath}>Path <kbd>X</kbd></button>
              <button type="button" aria-label="Chord chart" aria-pressed={chartOpen} aria-keyshortcuts="h" aria-haspopup="dialog" onClick={onOpenChordChart} title="Toggle chord chart (H)">Chart <kbd>H</kbd></button>
              <button type="button" aria-label="Guiding lines" title="Guiding lines (G)" aria-pressed={showGuideLines} aria-keyshortcuts="g" onClick={onToggleGuideLines}>Guides <kbd>G</kbd></button>
              <button type="button" aria-label="Show D string" title="Show D string (S)" aria-pressed={!twoStrings} aria-keyshortcuts="s" onClick={() => setTwoStrings(value => !value)}>D string <kbd>S</kbd></button>
              <button className="mini-auto-scroll-toggle" type="button" aria-label="Auto scroll" aria-pressed={autoScrollEnabled} aria-keyshortcuts="a" title="Toggle auto scroll (A)" onClick={onToggleAutoScroll}>Auto scroll · {autoScrollEnabled ? 'On' : 'Off'} <kbd>A</kbd></button>
            </div>
            <div className="mini-progress-controls mini-transport-controls" aria-label="Playback controls">
              <button type="button" onClick={onToggle} disabled={playbackState === 'starting'}>{playbackState === 'playing' ? 'Ⅱ Pause' : playbackState === 'paused' ? '▶ Resume' : playbackState === 'starting' ? 'Loading…' : gameMode ? '▶ Play game' : '▶ Play'}</button>
              <button type="button" onClick={onStop} disabled={playbackState === 'stopped' && progressProps.position === 0}>■ Stop</button>
            </div>
            {gameMode ? <GameBar {...progressProps} mini /> : <ProgressBar {...progressProps} mini />}
            <MiniChordStrip {...progressProps} activeIndex={activeIndex} colors={colors} darkMode={darkMode} nodeLabels={nodeLabels} />
            <div className="mini-shortcut-reminders"><kbd>Space</kbd> Play/pause · <kbd>M</kbd> Toggle mini menu</div>
          </section>
        </PopupContainer>
      )}
    </>
  );
}
