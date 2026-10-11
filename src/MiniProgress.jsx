import React, { useEffect, useReducer, useState } from "react";
import ProgressBar from "./ProgressBar.jsx";
import AutoScrollToggle from "./AutoScrollToggle.jsx";
import MiniChordStrip from "./MiniChordStrip.jsx";
import ShellChordDiagram from "./ShellChordDiagram.jsx";
import ChordQualityLegend from "./ChordQualityLegend.jsx";
import { timelineColor } from "./data/timelinePresentation.js";
import { miniProgressState } from "./miniProgressState.js";
import { shortcutKey } from "./keyboardShortcuts.js";

export default function MiniProgress({
  progressRef,
  chord,
  currentEvent,
  currentNode,
  activeIndex,
  colors,
  darkMode,
  nodeLabels,
  neverShow,
  autoScrollEnabled,
  onToggleAutoScroll,
  nodeColorMode,
  onToggleNodeColors,
  playbackState,
  onToggle,
  onStop,
  showFullPath,
  showGuideLines,
  onToggleFullPath,
  onToggleGuideLines,
  twoStrings,
  setTwoStrings,
  ...progressProps
}) {
  const [{ visible, dismissed }, dispatch] = useReducer(miniProgressState, {
    visible: true,
    dismissed: false,
  });
  const [manualOpen, setManualOpen] = useState(false);
  const shouldShow = manualOpen || (!visible && !dismissed && !neverShow);
  useEffect(() => {
    if (visible) setManualOpen(false);
  }, [visible]);
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
        // Closing applies only to this excursion outside the main bar's view.
        dispatch({ type: "visibility", visible: inView });
      },
      { threshold: [0, 1] },
    );
    if (progressRef.current) observer.observe(progressRef.current);
    return () => observer.disconnect();
  }, [progressRef]);
  return (
    <>
      {mounted && (
        <div
          className={`mini-playback-toasts ${shouldShow ? "mini-progress-enter" : "mini-progress-exit"}`}
          aria-hidden={!shouldShow || undefined}
          inert={!shouldShow}
        >
          <section
            className="mini-progress-toast"
            aria-label="Mini playback progress"
            aria-hidden={!shouldShow || undefined}
            inert={!shouldShow}
          >
            <div className="mini-progress-heading">
              <strong>{chord}</strong>
              <span>
                Bar{" "}
                {Math.min(
                  Math.floor(
                    ((progressProps.position /
                      progressProps.timeline.duration) *
                      progressProps.timeline.beats) /
                      progressProps.timeline.beatsPerBar,
                  ) + 1,
                  Math.ceil(
                    progressProps.timeline.beats /
                      progressProps.timeline.beatsPerBar,
                  ),
                )}
              </span>
              <button
                type="button"
                className="mini-progress-close"
                aria-label="Toggle mini menu"
                aria-keyshortcuts="m"
                title="Toggle mini menu (M)"
                onClick={() => {
                  setManualOpen(false);
                  dispatch({ type: "dismiss" });
                }}
              >
                ×
              </button>
            </div>
            {nodeColorMode === 'quality' && <ChordQualityLegend darkMode={darkMode} />}
            <ShellChordDiagram chord={currentEvent?.chord} node={currentNode} color={timelineColor(colors?.[activeIndex], darkMode)} darkMode={darkMode} />
            <div className="mini-progress-controls">
              {neverShow && <AutoScrollToggle enabled={autoScrollEnabled} onToggle={onToggleAutoScroll} />}
              <button
                type="button"
                onClick={onToggle}
                disabled={playbackState === "starting"}
              >
                {playbackState === "playing"
                  ? "Ⅱ Pause"
                  : playbackState === "paused"
                    ? "▶ Resume"
                    : playbackState === "starting"
                      ? "Loading…"
                      : "▶ Play"}
              </button>
              <button
                type="button"
                onClick={onStop}
                disabled={
                  playbackState === "stopped" && progressProps.position === 0
                }
              >
                ■ Stop
              </button>
            </div>
            <div className="mini-view-controls">
              <button type="button" aria-pressed={nodeColorMode === 'quality'} aria-keyshortcuts="c" title="Toggle node colors (C)" onClick={onToggleNodeColors}>
                Node colors <strong>{nodeColorMode === 'quality' ? 'Chord quality' : 'Rainbow sequence'}</strong> <kbd>C</kbd>
              </button>
              <button
                type="button"
                aria-pressed={showFullPath}
                aria-keyshortcuts="x"
                onClick={onToggleFullPath}
              >
                Full path <strong>{showFullPath ? "On" : "Off"}</strong>{" "}
                <kbd>X</kbd>
              </button>
              <button
                type="button"
                aria-pressed={showGuideLines}
                aria-keyshortcuts="g"
                onClick={onToggleGuideLines}
              >
                Guide lines <strong>{showGuideLines ? "On" : "Off"}</strong>{" "}
                <kbd>G</kbd>
              </button>
              <button
                type="button"
                aria-pressed={!twoStrings}
                aria-keyshortcuts="g"
                onClick={() => setTwoStrings((val) => !val)}
              >
                String mode
                <strong>
                  {twoStrings ? "Hide D String" : "Show D String"}
                </strong>{" "}
                <kbd>S</kbd>
              </button>
            </div>
            <ProgressBar {...progressProps} mini />
            <MiniChordStrip
              {...progressProps}
              activeIndex={activeIndex}
              colors={colors}
              darkMode={darkMode}
              nodeLabels={nodeLabels}
            />
            <div className="mini-shortcut-reminders">
              <kbd>Space</kbd> Play/pause · <kbd>M</kbd> Toggle mini menu · <kbd>C</kbd> Node colors
            </div>
          </section>
        </div>
      )}
    </>
  );
}
