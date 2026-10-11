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
import ChordChartModal from "./ChordChartModal.jsx";
import { shortcutKey } from "./keyboardShortcuts.js";
import ShellChordDiagram from "./ShellChordDiagram.jsx";
import ChordQualityLegend from "./ChordQualityLegend.jsx";
import { timelineColor } from "./data/timelinePresentation.js";
import { chordDisplayColors } from "./data/chordQualityColors.js";
import MiniChordStrip from "./MiniChordStrip.jsx";
import { chordProgress } from "./audio/pipeProgress.js";
import { outgoingVisitColors } from "./SongChart.jsx";
import { songsById } from "./data/songs.js";
import { sectionTimeline } from "./audio/sectionTimeline.js";
import GameMode from './GameMode.jsx';
import { playJudgmentCue } from './audio/gameCues.js';
import { countInBeat, countInChords, countInSchedule, countInLabel } from './audio/countIn.js';
import { shellTargets } from './audio/game.js';
import GameCountIn from './GameCountIn.jsx';
import GameBar from './GameBar.jsx';
import GameAtmosphere from './GameAtmosphere.jsx';
import ArcadeModeToggle from './ArcadeModeToggle.jsx';

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
    autoScrollEnabled,
    onToggleAutoScroll,
    chartOpen,
    setChartOpen,
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
  const [gameMode, setGameMode] = useState(false);
  const [gameReady, setGameReady] = useState(false);
  const [countInBeats, setCountInBeats] = useState(0);
  const [countInGo, setCountInGo] = useState(false);
  useEffect(() => {
    document.body.dataset.gameMode = String(gameMode);
    return () => { delete document.body.dataset.gameMode; };
  }, [gameMode]);
  useEffect(() => {
    function handleChartShortcut(event) {
      if (shortcutKey(event) !== 'h') return;
      event.preventDefault();
      setChartOpen(open => !open);
    }
    window.addEventListener('keydown', handleChartShortcut);
    return () => window.removeEventListener('keydown', handleChartShortcut);
  }, [setChartOpen]);
  const player = useRef(null);
  const playButton = useRef(null);
  const progressRef = useRef(null);
  const [seekVersion, setSeekVersion] = useState(0);
  const [loopIteration, setLoopIteration] = useState(0);
  const frame = useRef(null);
  const routeColors = useMemo(() => chordDisplayColors(songData, outgoingVisitColors(songData)), [songData]);
  const timeline = useMemo(
    () => buildTimeline(songData.playback, bpm, songData.beatsPerBar || 4),
    [songData, bpm],
  );
  const sectionSegments = useMemo(
    () => sectionTimeline(timeline, songData),
    [timeline, songData],
  );
  const gameTargets = useMemo(() => shellTargets(timeline, songData.nodes), [timeline, songData]);
  const [firstGameChord, nextGameChord] = countInChords(gameTargets, position, timeline.duration);
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
    setCountInBeats(0);
    setCountInGo(false);
  }
  function tick() {
    const current = player.current;
    if (!current || current.context.state === "closed") return;
    const { position: elapsed, wrapped } = current.loopPosition();
    const remaining = current.countInEndsAt === null || current.countInEndsAt === undefined ? -Infinity : current.countInEndsAt - current.context.currentTime;
    setCountInBeats(countInBeat(remaining, 60 / bpm));
    setCountInGo(remaining <= 0 && remaining > -.45);
    if (wrapped) {
      setSeekVersion((version) => version + 1);
      setLoopIteration((iteration) => iteration + 1);
    }
    setPosition(elapsed);
    frame.current = requestAnimationFrame(tick);
  }
  async function toggle(event) {
    if (gameMode && !gameReady) { setError('Choose and connect your audio interface before pressing Play.'); return; }
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
        const readySchedule = countInSchedule(60 / bpm);
        const current = new JazzPlayer(gameMode ? { bass: false, pianoOnNodes: true, racingCountIn: true, countIn: readySchedule.totalBeats * 60 / bpm, countInIntroBeats: readySchedule.introBeats, beatSeconds: 60 / bpm } : {});
        player.current = current;
        current.master.gain.value = gameMode ? .03 : volume / 100;
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
    setCountInBeats(0);
    setCountInGo(false);
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
  const currentNode = songData.nodes.find(node => node.id === active?.nodeId);
  useEffect(() => {
    if (gameMode && !gameReady && state !== 'stopped') stop();
  }, [gameMode, gameReady, state]);
  function gamePosition() {
    const current = player.current;
    if (!current?.timeline || current.startedAt === undefined) return position;
    const raw = current.context.currentTime - current.startedAt;
    return raw < 0 ? raw : raw % timeline.duration;
  }
  function handleGameJudgment(result) {
    const current = player.current;
    if (current) playJudgmentCue(current.context, result, source => current.track(source));
  }
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
  const TransportSettings = gameMode ? 'details' : 'div';
  const gamePlayControls = <div className="game-start-controls"><span className="game-play-step">2 · Ready, set, strum!</span><button ref={playButton} className="game-play-button" type="button" disabled={state === 'starting' || !gameReady} onClick={toggle}><span aria-hidden="true">{state === 'playing' ? 'Ⅱ' : '▶'}</span><strong>{state === 'starting' ? 'GETTING READY…' : state === 'playing' ? 'PAUSE GAME' : state === 'paused' ? 'KEEP PLAYING' : 'LET’S PLAY!'}</strong></button><span>{gameReady ? 'Check the signal, then Play · Space to play / pause' : 'Connect your interface in step 1 first ♡'}</span><button className="game-stop-button" type="button" onClick={stop} disabled={!running && position === 0}>■ Stop run</button></div>;
  return (
    <section
      className={`player${gameMode ? ' is-game-mode' : ''}`}
      aria-label="Chord playback"
      aria-busy={state === "starting"}
    >
      <ArcadeModeToggle enabled={gameMode} onToggle={() => { stop(); setGameReady(false); setGameMode(value => !value); setError(''); }} />
      {gameMode && <GameAtmosphere playing={state === 'playing'} />}
      {gameMode && <GameCountIn beat={countInBeats} go={countInGo} beatSeconds={60 / bpm} starting={state === 'starting'} paused={state === 'paused'} firstChord={firstGameChord?.chord} nextChord={nextGameChord?.chord} />}
      {gameMode && <GameMode playControls={gamePlayControls} timeline={timeline} songData={songData} darkMode={darkMode} playbackState={state} seekVersion={seekVersion} loopIteration={loopIteration} position={position} getPosition={gamePosition} onReady={setGameReady} onJudgment={handleGameJudgment} />}
      {gameMode && <GameBar ref={progressRef} timeline={timeline} sectionSegments={sectionSegments} position={position} disabled={state === 'starting'} onSeek={seek} />}
      <TransportSettings className="game-accompaniment-settings">
      {gameMode && <summary>Tempo & backing sound</summary>}
      <div className="transport">
        {!gameMode && <button
          ref={playButton}
          className="play"
          type="button"
          onClick={toggle}
          disabled={state === "starting" || (gameMode && !gameReady)}
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
            gameMode ? '▶ Play game' : "▶ Play chords"
          )}
        </button>}
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
            value={gameMode ? 3 : volume}
            disabled={gameMode}
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
            disabled={gameMode}
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
      </div>
      </TransportSettings>
      {!gameMode && <div className="player-status">
        {gameMode && countInBeats > 0 && <strong className="game-count-in">{countInLabel(countInBeats, 60 / bpm)}</strong>}
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
      </div>}
      {!gameMode && <div className="main-chord-preview full-fretboard-preview">
        {songData.nodeColorMode === 'quality' && <ChordQualityLegend darkMode={darkMode} />}
        <ShellChordDiagram
          fullFretboard
          chord={active?.chord}
          node={currentNode}
          color={timelineColor(routeColors[activeIndex], darkMode)}
          darkMode={darkMode}
        />
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
      </div>}
      {!gameMode && <ProgressBar
        ref={progressRef}
        timeline={timeline}
        sectionSegments={sectionSegments}
        position={position}
        disabled={state === "starting"}
        onSeek={seek}
      />}
      <MiniProgress
        key={gameMode ? 'game' : 'practice'}
        gameMode={gameMode}
        gameReady={gameReady}
        chartOpen={chartOpen}
        onOpenChordChart={() => setChartOpen(open => !open)}
        nodeColorMode={songData.nodeColorMode}
        currentEvent={active}
        currentNode={currentNode}
        showFullPath={showFullPath}
        showGuideLines={showGuideLines}
        twoStrings={twoStrings}
        setTwoStrings={setTwoStrings}
        onToggleFullPath={onToggleFullPath}
        onToggleGuideLines={onToggleGuideLines}
        playbackState={state}
        onToggle={toggle}
        onStop={stop}
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
      {chartOpen && <ChordChartModal title={songData.title} onClose={() => setChartOpen(false)}
        timeline={timeline} position={position} colors={routeColors} darkMode={darkMode}
        disabled={state === "starting"} onSeek={seek} />}
      {!gameMode && <ChordTimeline
        nodeLabels={Object.fromEntries(
          songData.nodes.map((node) => [node.id, node.chord]),
        )}
        colors={routeColors}
        darkMode={darkMode}
        timeline={timeline}
        activeIndex={running || position > 0 ? activeIndex : -1}
        onSeek={seek}
        disabled={state === "starting"}
      />}
      {error && (
        <p role="alert" className="audio-error">
          {error}
        </p>
      )}
    </section>
  );
});

export default ChordPlayer;
