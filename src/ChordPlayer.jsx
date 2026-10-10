import React, {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
} from "react";
import { buildTimeline } from "./audio/songs.js";
import { JazzPlayer } from "./audio/ensemble.js";
import ChordTimeline from "./ChordTimeline.jsx";
import ProgressBar from "./ProgressBar.jsx";
import MiniProgress from "./MiniProgress.jsx";
import MiniChordStrip from "./MiniChordStrip.jsx";
import { chordProgress } from "./audio/pipeProgress.js";
import { outgoingVisitColors } from "./SongChart.jsx";
import { songsById } from "./data/songs.js";
import { sectionTimeline } from "./audio/sectionTimeline.js";

const ChordPlayer = forwardRef(function ChordPlayer(
  {
    song,
    songData = songsById[song],
    darkMode,
    showFullPath,
    showGuideLines,
    onToggleFullPath,
    onToggleGuideLines,
    onPlaybackLaunch,
    onChordChange,
    onPlaybackPosition,
    twoStrings,
    setTwoStrings,
  },
  controlRef,
) {
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(30);
  const [drumVolume, setDrumVolume] = useState(24);
  const [bassVolume, setBassVolume] = useState(38);
  const [state, setState] = useState("stopped");
  const [hasPlayed, setHasPlayed] = useState(false);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState("");
  const [neverShowMiniProgress, setNeverShowMiniProgress] = useState(false);
  const player = useRef(null);
  const playButton = useRef(null);
  const progressRef = useRef(null);
  const [seekVersion, setSeekVersion] = useState(0);
  const [loopIteration, setLoopIteration] = useState(0);
  const frame = useRef(null);
  const routeColors = useMemo(() => outgoingVisitColors(songData), [songData]);
  const timeline = useMemo(
    () => buildTimeline(songData.playback, bpm, songData.beatsPerBar || 4),
    [songData, bpm],
  );
  const sectionSegments = useMemo(
    () => sectionTimeline(timeline, songData),
    [timeline, songData],
  );
  useLayoutEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      player.current?.stop();
      player.current = null;
    },
    [],
  );
  useImperativeHandle(controlRef, () => ({ stop }));
  function stop() {
    cancelAnimationFrame(frame.current);
    player.current?.stop();
    player.current = null;
    setState("stopped");
    setPosition(0);
    setHasPlayed(false);
    setLoopIteration(0);
  }
  function tick() {
    const current = player.current;
    if (!current || current.context.state === "closed") return;
    const { position: elapsed, wrapped } = current.loopPosition();
    if (wrapped) {
      setSeekVersion((version) => version + 1);
      setLoopIteration((iteration) => iteration + 1);
    }
    setPosition(elapsed);
    frame.current = requestAnimationFrame(tick);
  }
  async function toggle(event) {
    const launchButton = event?.currentTarget || playButton.current;
    setError("");
    try {
      if (state === "playing") {
        await player.current.pause();
        cancelAnimationFrame(frame.current);
        setState("paused");
      } else if (state === "paused") {
        await player.current.resume();
        setState("playing");
        tick();
      } else {
        setState("starting");
        const startAt = position >= timeline.duration ? 0 : position;
        setPosition(startAt);
        const current = new JazzPlayer();
        player.current = current;
        current.master.gain.value = volume / 100;
        current.drumBus.gain.value = drumVolume / 100;
        current.bassBus.gain.value = bassVolume / 100;
        const startEvent = timeline.events.find(
          (event) =>
            startAt >= event.start && startAt < event.start + event.duration,
        );
        await current.start(timeline, startAt, () =>
          onPlaybackLaunch?.(
            startEvent?.nodeId,
            (launchButton?.isConnected
              ? launchButton
              : playButton.current
            )?.getBoundingClientRect(),
            startEvent,
          ),
        );
        if (player.current !== current) return;
        setHasPlayed(true);
        setState("playing");
        tick();
      }
    } catch (e) {
      stop();
      setError(e.message || "Could not start audio.");
    }
  }
  const keyboardPlayback = useRef(null);
  useLayoutEffect(() => {
    keyboardPlayback.current = { toggle, state };
  });
  useEffect(() => {
    let pending = false;
    function handleSpace(event) {
      if (
        event.code !== "Space" ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, button, a, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"], [role="textbox"]',
        )
      )
        return;
      event.preventDefault();
      if (
        event.repeat ||
        pending ||
        keyboardPlayback.current?.state === "starting"
      )
        return;
      pending = true;
      Promise.resolve(keyboardPlayback.current?.toggle()).finally(() => {
        pending = false;
      });
    }
    window.addEventListener("keydown", handleSpace);
    return () => window.removeEventListener("keydown", handleSpace);
  }, []);
  function seek(value) {
    setSeekVersion((version) => version + 1);
    const next = Math.max(0, Math.min(timeline.duration, Number(value)));
    cancelAnimationFrame(frame.current);
    if (player.current?.timeline) {
      player.current.seek(next);
      if (state === "playing") tick();
    }
    setPosition(next);
  }
  const active =
    timeline.events.find(
      (e) => position >= e.start && position < e.start + e.duration,
    ) || (position === timeline.duration ? timeline.events.at(-1) : undefined);
  const running = state !== "stopped";
  const activeIndex = timeline.events.indexOf(active);
  useLayoutEffect(() => {
    onPlaybackPosition?.({
      visitIndex: activeIndex,
      seekVersion,
      loopIteration,
      progress: chordProgress(active, position),
      beats: active?.beats || 0,
      position,
      bpm,
    });
  }, [
    position,
    activeIndex,
    active,
    seekVersion,
    loopIteration,
    bpm,
    onPlaybackPosition,
  ]);
  useEffect(() => {
    onChordChange?.(
      hasPlayed && (running || position > 0) && activeIndex >= 0
        ? {
            song,
            event: timeline.events[activeIndex],
            visitIndex: activeIndex,
            seekVersion,
            loopIteration,
            isPlaying: state === "playing",
          }
        : null,
    );
  }, [
    song,
    activeIndex,
    hasPlayed,
    running,
    position > 0,
    onChordChange,
    timeline,
    seekVersion,
    loopIteration,
    state,
  ]);
  return (
    <section
      className="player"
      aria-label="Chord playback"
      aria-busy={state === "starting"}
    >
      <div className="transport">
        <button
          ref={playButton}
          className="play"
          type="button"
          onClick={toggle}
          disabled={state === "starting"}
        >
          {state === "starting" ? (
            <>
              <span className="spinner" aria-hidden="true" /> Loading sounds…
            </>
          ) : state === "playing" ? (
            "Ⅱ Pause"
          ) : state === "paused" ? (
            "▶ Resume"
          ) : (
            "▶ Play chords"
          )}
        </button>
        <button
          type="button"
          onClick={stop}
          disabled={!running && position === 0}
        >
          ■ Stop
        </button>
        <label>
          Tempo{" "}
          <input
            type="number"
            min="40"
            max="240"
            step="5"
            value={bpm}
            disabled={running}
            onChange={(e) =>
              setBpm(Math.max(40, Math.min(240, Number(e.target.value) || 40)))
            }
          />{" "}
          BPM
        </label>
        <label>
          Piano{" "}
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              const value = Number(e.target.value);
              setVolume(value);
              if (player.current)
                player.current.master.gain.setTargetAtTime(
                  value / 100,
                  player.current.context.currentTime,
                  0.02,
                );
            }}
          />
        </label>
        <label>
          Brushes{" "}
          <input
            aria-label="Brush drums volume"
            type="range"
            min="0"
            max="100"
            value={drumVolume}
            onChange={(e) => {
              const value = Number(e.target.value);
              setDrumVolume(value);
              if (player.current)
                player.current.drumBus.gain.setTargetAtTime(
                  value / 100,
                  player.current.context.currentTime,
                  0.02,
                );
            }}
          />
        </label>
        <label>
          Bass{" "}
          <input
            aria-label="Bass volume"
            type="range"
            min="0"
            max="100"
            value={bassVolume}
            onChange={(e) => {
              const value = Number(e.target.value);
              setBassVolume(value);
              if (player.current)
                player.current.bassBus.gain.setTargetAtTime(
                  value / 100,
                  player.current.context.currentTime,
                  0.02,
                );
            }}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={neverShowMiniProgress}
            onChange={(event) => setNeverShowMiniProgress(event.target.checked)}
          />{" "}
          Never show mini bar progress popup
        </label>
      </div>
      <div className="player-status">
        {running && active && (
          <span className="current-chord">
            {active.chord.replaceAll("b", "♭")}
          </span>
        )}
        <span>
          {running && active
            ? `${active.section ? active.section + " · " : ""}Bar ${Math.floor((position * bpm) / (60 * timeline.beatsPerBar)) + 1} of ${timeline.beats / timeline.beatsPerBar}`
            : `${timeline.beats / timeline.beatsPerBar} bars · ${Math.round(timeline.duration)} seconds`}
        </span>
      </div>
      <div className="main-chord-preview">
        <MiniChordStrip
          timeline={timeline}
          position={position}
          activeIndex={activeIndex}
          colors={routeColors}
          darkMode={darkMode}
          nodeLabels={Object.fromEntries(
            songData.nodes.map((node) => [node.id, node.chord]),
          )}
          onSeek={seek}
          disabled={state === "starting"}
        />
      </div>
      <ProgressBar
        ref={progressRef}
        timeline={timeline}
        sectionSegments={sectionSegments}
        position={position}
        disabled={state === "starting"}
        onSeek={seek}
      />
      <MiniProgress
        showFullPath={showFullPath}
        showGuideLines={showGuideLines}
        twoStrings={twoStrings}
        setTwoStrings={setTwoStrings}
        onToggleFullPath={onToggleFullPath}
        onToggleGuideLines={onToggleGuideLines}
        playbackState={state}
        onToggle={toggle}
        onStop={stop}
        neverShow={neverShowMiniProgress}
        progressRef={progressRef}
        timeline={timeline}
        sectionSegments={sectionSegments}
        position={position}
        disabled={state === "starting"}
        onSeek={seek}
        chord={songData.title}
        activeIndex={activeIndex}
        colors={routeColors}
        darkMode={darkMode}
        nodeLabels={Object.fromEntries(
          songData.nodes.map((node) => [node.id, node.chord]),
        )}
      />
      <ChordTimeline
        nodeLabels={Object.fromEntries(
          songData.nodes.map((node) => [node.id, node.chord]),
        )}
        colors={routeColors}
        darkMode={darkMode}
        timeline={timeline}
        activeIndex={running || position > 0 ? activeIndex : -1}
        onSeek={seek}
        disabled={state === "starting"}
      />
      {error && (
        <p role="alert" className="audio-error">
          {error}
        </p>
      )}
    </section>
  );
});

export default ChordPlayer;
