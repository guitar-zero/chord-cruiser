import React, { useEffect, useReducer, useRef, useState } from "react";
import ProgressBar from "./ProgressBar.jsx";
import GameBar from './GameBar.jsx';
import ChordQualityLegend from "./ChordQualityLegend.jsx";
import MiniChordStrip from "./MiniChordStrip.jsx";
import MiniLeadSheet from "./MiniLeadSheet.jsx";
import ShellChordDiagram from "./ShellChordDiagram.jsx";
import { timelineColor } from "./data/timelinePresentation.js";
import { miniProgressState } from "./miniProgressState.js";
import { shortcutKey } from "./keyboardShortcuts.js";
import { popularSongIdsSet } from "./data/popularSongs.js";
import { popupPlacement } from './data/popupPlacement.js';

export default function MiniProgress({
  progressRef,
  chord,
  songId,
  songOptions,
  onSongChange,
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
  instrument,
  playbackState,
  onToggle,
  onStop,
  wholeFretboard,
  onToggleWholeFretboard,
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
  const [minichartOpen, setMinichartOpen] = useState(true);
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
      const key = shortcutKey(event);
      if (key === '.') {
        event.preventDefault();
        setMinichartOpen(open => !open);
        if (!shouldShow) setManualOpen(true);
        return;
      }
      if (key !== "/") return;
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
  const seekToChord = value => {
    progressProps.onSeek?.(value);
    if (isMobile) closeMenu();
  };
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
            className={`mini-progress-toast${minichartOpen ? ' has-minichart' : ''} ${shouldShow ? "mini-progress-enter" : "mini-progress-exit"}`}
            aria-label="Mini playback progress"
            aria-hidden={!shouldShow || undefined}
            inert={!shouldShow}
          >
            {gameMode && <div className="game-banner"><strong>GUITAR GAME MODE</strong></div>}
            <div className="mini-progress-heading">
              {onSongChange && songOptions ? <div className="mini-song-picker">
                <select aria-label="Choose song" title="Choose song" value={songId} onChange={event => {
                  onSongChange(event.target.value);
                  event.currentTarget.blur();
                }}>
                  {songOptions.map(song => <option key={song.id} value={song.id}>{popularSongIdsSet.has(song.id) ? '★ ' : ''}{song.title}</option>)}
                </select>
                <span aria-hidden="true">⌄</span>
              </div> : <strong>{chord}</strong>}
              <span>Bar {Math.min(Math.floor(progressProps.position / progressProps.timeline.duration * progressProps.timeline.beats / progressProps.timeline.beatsPerBar) + 1, Math.ceil(progressProps.timeline.beats / progressProps.timeline.beatsPerBar))}</span>
              <button type="button" className="mini-progress-close" autoFocus={isMobile} aria-label="Toggle mini menu" aria-keyshortcuts="/" title="Toggle mini menu (/)" onClick={closeMenu}>×</button>
            </div>
            {nodeColorMode === 'quality' && <ChordQualityLegend darkMode={darkMode} compact />}
            {gameMode && <strong>{gameHasStarted ? 'Next' : 'First chord'}</strong>}
            {instrument !== 'piano' && <ShellChordDiagram chord={(gameMode ? nextEvent : currentEvent)?.chord} node={gameMode ? nextNode : currentNode} color={timelineColor(colors?.[gameMode ? nextEvent?.index : activeIndex], darkMode)} darkMode={darkMode} />}
            <div className="mini-view-controls mini-compact-controls">
              <button className="full-progression-toggle" type="button" aria-label="Full progression during playback" title="Full progression during playback (V)" aria-pressed={showFullPath} aria-keyshortcuts="v" onClick={onToggleFullPath}>Full progression <kbd>V</kbd></button>
              <button type="button" aria-label="Guidelines" title="Guidelines (,)" aria-pressed={showGuideLines} aria-keyshortcuts="," onClick={onToggleGuideLines}>Guidelines <kbd>,</kbd></button>
              <button type="button" aria-label="Minichart" title="Toggle minichart (.)" aria-pressed={minichartOpen} aria-keyshortcuts="." onClick={() => setMinichartOpen(open => !open)}>Minichart <kbd>.</kbd></button>
              <button type="button" aria-label="Auto scroll" aria-pressed={autoScrollEnabled} aria-keyshortcuts="b" title="Toggle auto scroll (B)" onClick={onToggleAutoScroll}>Auto scroll <kbd>B</kbd></button>
              <button type="button" disabled={instrument === 'piano'} aria-pressed={wholeFretboard} aria-keyshortcuts="n" onClick={onToggleWholeFretboard} title="Toggle frets 1–12 on the current map’s strings (N)">12 frets <kbd>N</kbd></button>
              <button type="button" aria-label="Show D string" title="Show D string (M)" aria-pressed={!twoStrings} aria-keyshortcuts="m" onClick={() => setTwoStrings(value => !value)}>D string <kbd>M</kbd></button>
            </div>
            <div className="mini-progress-controls mini-transport-controls" aria-label="Playback controls">
              <button className="mini-play-button" type="button" onClick={onToggle} disabled={playbackState === 'starting'}><span className="mini-play-sparkle" aria-hidden="true">♫</span><strong>{playbackState === 'playing' ? 'Ⅱ Pause' : playbackState === 'paused' ? '▶ Resume' : playbackState === 'starting' ? 'Loading…' : gameMode ? '▶ Play game' : '▶ Play'}</strong><span className="mini-play-sparkle" aria-hidden="true">✦</span></button>
              <button type="button" onClick={onStop} disabled={playbackState === 'stopped' && progressProps.position === 0}>■ Stop</button>
            </div>
            {gameMode ? <GameBar {...progressProps} onSeek={seekToChord} mini /> : <ProgressBar {...progressProps} onSeek={seekToChord} mini />}
            <MiniChordStrip {...progressProps} onSeek={seekToChord} activeIndex={activeIndex} colors={colors} darkMode={darkMode} nodeLabels={nodeLabels} />
            <div className="mini-shortcut-reminders"><kbd>Space</kbd> Play/pause · <kbd>/</kbd> Toggle mini menu · <kbd>C</kbd> Full chart modal</div>
            {minichartOpen && <div className="mini-inline-chart">
              <MiniLeadSheet alignCurrentSection timeline={progressProps.timeline} position={progressProps.position} colors={colors} darkMode={darkMode} disabled={progressProps.disabled} onSeek={seekToChord} />
            </div>}
          </section>
        </PopupContainer>
      )}
    </>
  );
}
