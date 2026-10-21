import React, {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
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
import GameTempoOptions from './GameTempoOptions.jsx';
import { playJudgmentCue } from './audio/gameCues.js';
import { countInComplete, countInBeat, countInChords, countInSchedule, countInLabel, shouldLaunchCountInIndicator } from './audio/countIn.js';
import { nextShellTarget, shellTargets } from './audio/game.js';
import GameCountIn from './GameCountIn.jsx';
import GameAtmosphere from './GameAtmosphere.jsx';
import { PlaybackRenderGate } from './audio/playbackRenderGate.js';
import { positionNodeShapes } from './data/chordShapes.js';

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
    onCountInChange,
    onPlaybackActivityChange,
    onPlaybackPosition,
    onSectionSeek,
    twoStrings,
    setTwoStrings,
    wholeFretboard,
    onToggleWholeFretboard,
    autoScrollEnabled,
    onToggleAutoScroll,
    chartOpen,
    setChartOpen,
    gameMode,
    selectionControls,
    songOptions,
    onSongChange,
  },
  controlRef,
) {
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(30);
  const [drumVolume, setDrumVolume] = useState(24);
  const [bassVolume, setBassVolume] = useState(38);
  const [state, setState] = useState("stopped");
  useLayoutEffect(() => {
    onPlaybackActivityChange?.(state === 'starting' || state === 'playing');
  }, [state, onPlaybackActivityChange]);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);
  positionRef.current = position;
  const [error, setError] = useState("");
  const [gameReady, setGameReady] = useState(false);
  const gameRef = useRef(null);
  const [countInBeats, setCountInBeats] = useState(0);
  const [countInGo, setCountInGo] = useState(false);
  const countInTargets = useRef(null);
  const countInActive = gameMode && (state === 'starting' || countInBeats > 0);
  useLayoutEffect(() => { onCountInChange?.(countInActive); }, [countInActive, onCountInChange]);
  useEffect(() => () => onCountInChange?.(false), [onCountInChange]);
  useEffect(() => {
    document.body.dataset.gameMode = String(gameMode);
    return () => { delete document.body.dataset.gameMode; };
  }, [gameMode]);
  useEffect(() => {
    function handleChartShortcut(event) {
      if (shortcutKey(event) !== 'c') return;
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
  const renderGate = useRef(new PlaybackRenderGate());
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
  const [firstGameChord, nextGameChord] = countInTargets.current || countInChords(gameTargets, position, timeline.duration);
  const gameNodeShapes = useMemo(() => positionNodeShapes(songData), [songData]);
  useLayoutEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      player.current?.stop();
      player.current = null;
    },
    [],
  );
  useImperativeHandle(controlRef, () => ({
    stop,
    seekToNode(nodeId) {
      const event = timeline.events.find(event => event.nodeId === nodeId || event.nodeIds?.includes(nodeId));
      if (event) return seekAndPlay(event.start);
    },
  }));
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
    countInTargets.current = null;
  }
  useLayoutEffect(() => {
    stop();
    setError('');
    setSeekVersion(0);
  }, [song, songData.key]);
  function tick(time = performance.now()) {
    const current = player.current;
    if (!current || current.context.state === "closed") return;
    const { position: elapsed, wrapped } = current.loopPosition();
    const remaining = current.countInEndsAt === null || current.countInEndsAt === undefined ? -Infinity : current.countInEndsAt - current.context.currentTime;
    setCountInBeats(countInBeat(remaining, 60 / bpm));
    setCountInGo(remaining <= 0 && remaining > -1.2);
    if (current.launchCountIn && shouldLaunchCountInIndicator(remaining, 60 / bpm)) {
      const launch = current.launchCountIn;
      current.launchCountIn = null;
      Promise.resolve().then(launch).then(() => {
        if (player.current === current && !current.stopped) setHasPlayed(true);
      }).catch(error => setError(error.message || 'Could not launch the indicator.'));
    }
    if (wrapped) {
      current.seekVersion++;
      current.loopIteration++;
      setSeekVersion(current.seekVersion);
      setLoopIteration(current.loopIteration);
    }
    const visit = timeline.events.findIndex(event => elapsed >= event.start && elapsed < event.start + event.duration);
    const event = timeline.events[visit];
    onPlaybackPosition?.({ visitIndex: visit, seekVersion: current.seekVersion, loopIteration: current.loopIteration,
      progress: chordProgress(event, elapsed), beats: event?.beats || 0, position: elapsed, bpm });
    if (renderGate.current.shouldRender(time, visit, wrapped)) setPosition(elapsed);
    frame.current = requestAnimationFrame(tick);
  }
  async function toggle(event, startPosition = position, startSeekVersion = seekVersion) {
    if (gameMode && !gameReady) { setError('Choose and connect your audio interface before pressing Play.'); return; }
    const launchButton = event?.currentTarget || playButton.current;
    if (state !== 'playing') onPlaybackActivityChange?.(true);
    setError("");
    try {
      if (state === "playing") {
        await player.current.pause();
        cancelAnimationFrame(frame.current);
        setPosition(player.current.loopPosition().position);
        setState("paused");
      } else if (state === "paused") {
        await player.current.resume();
        setState("playing");
        tick();
      } else {
        setState("starting");
        const startAt = startPosition >= timeline.duration ? 0 : startPosition;
        countInTargets.current = countInChords(gameTargets, startAt, timeline.duration);
        setPosition(startAt);
        const readySchedule = countInSchedule(60 / bpm);
        const current = new JazzPlayer(gameMode ? { bass: false, pianoOnNodes: true, racingCountIn: true, countIn: readySchedule.totalBeats * 60 / bpm, countInIntroBeats: readySchedule.introBeats, beatSeconds: 60 / bpm } : {});
        player.current = current;
        current.seekVersion = startSeekVersion;
        current.loopIteration = loopIteration;
        renderGate.current = new PlaybackRenderGate();
        current.master.gain.value = gameMode ? .3 : volume / 100;
        current.drumBus.gain.value = drumVolume / 100;
        current.bassBus.gain.value = bassVolume / 100;
        const startEvent = timeline.events.find(
          (event) =>
            startAt >= event.start && startAt < event.start + event.duration,
        );
        const launch = () => {
          const flightStartsAt = current.context.currentTime;
          const flightSeconds = current.countInEndsAt - flightStartsAt;
          const launchSource = gameMode
            ? document.querySelector('.game-count-in-card .count-in-chord-node') || document.querySelector('.game-count-in-card')
            : null;
          return (
          onPlaybackLaunch?.(
            startEvent?.nodeId,
            (launchSource || (launchButton?.isConnected
              ? launchButton
              : playButton.current
            ))?.getBoundingClientRect(),
            startEvent,
            gameMode ? {
              emergeFraction: flightSeconds > 0 ? Math.min(.2, .32 / flightSeconds) : 0,
              progress: () => flightSeconds > 0
                ? Math.max(0, Math.min(1, (current.context.currentTime - flightStartsAt) / flightSeconds))
                : 1,
            } : undefined,
          ));
        };
        current.launchCountIn = gameMode ? launch : null;
        await current.start(timeline, startAt, gameMode ? undefined : launch);
        if (player.current !== current) return;
        if (!gameMode) setHasPlayed(true);
        setState("playing");
        tick();
      }
    } catch (e) {
      onPlaybackActivityChange?.(false);
      stop();
      setError(e.message || "Could not start audio.");
    }
  }
  const keyboardPlayback = useRef(null);
  useLayoutEffect(() => {
    keyboardPlayback.current = { toggle: gameMode ? requestGamePlay : toggle, state };
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
  function seekAndPlay(value) {
    if (state === 'starting') return;
    const next = Math.max(0, Math.min(timeline.duration, Number(value)));
    const nextVersion = seek(next);
    if (state !== 'playing') return toggle(undefined, next, nextVersion);
  }
  function seek(value) {
    countInTargets.current = null;
    setCountInBeats(0);
    setCountInGo(false);
    const nextVersion = (player.current?.seekVersion ?? seekVersion) + 1;
    setSeekVersion(nextVersion);
    if (player.current) player.current.seekVersion = nextVersion;
    if (player.current?.launchCountIn) { player.current.launchCountIn = null; setHasPlayed(true); }
    renderGate.current = new PlaybackRenderGate();
    const next = Math.max(0, Math.min(timeline.duration, Number(value)));
    cancelAnimationFrame(frame.current);
    if (player.current?.timeline) {
      player.current.seek(next);
      if (state === "playing") tick();
    }
    setPosition(next);
    const segment = sectionSegments.find(segment => next >= segment.start && next < segment.end)
      || (next === timeline.duration ? sectionSegments.at(-1) : null);
    if (segment) onSectionSeek?.(segment.id);
    return nextVersion;
  }
  const active =
    timeline.events.find(
      (e) => position >= e.start && position < e.start + e.duration,
    ) || (position === timeline.duration ? timeline.events.at(-1) : undefined);
  const running = state !== "stopped";
  const activeIndex = timeline.events.indexOf(active);
  const currentNode = songData.nodes.find(node => node.id === active?.nodeId);
  const gameHasStarted = hasPlayed && !countInActive;
  const nextGameTarget = nextShellTarget(gameTargets, activeIndex, gameHasStarted);
  const nextGameNode = songData.nodes.find(node => node.id === nextGameTarget?.nodeId);
  useEffect(() => {
    if (gameMode && !gameReady && state !== 'stopped') stop();
  }, [gameMode, gameReady, state]);
  const gamePosition = useCallback(() => {
    const current = player.current;
    if (!current?.timeline || current.startedAt === undefined) return positionRef.current;
    const raw = current.context.currentTime - current.startedAt;
    return raw < 0 ? raw : raw % timeline.duration;
  }, [timeline.duration]);
  const canJudgeGame = useCallback(() => {
    const current = player.current;
    return Boolean(current?.timeline && countInComplete(current.context.currentTime, current.countInEndsAt));
  }, []);
  const handleGameJudgment = useCallback(result => {
    const current = player.current;
    if (current) playJudgmentCue(current.context, result, source => current.track(source));
  }, []);
  function requestGamePlay(event) {
    if (gameReady) return toggle(event);
    gameRef.current?.openSetup();
  }
  const actionsRef = useRef(null);
  actionsRef.current = { toggle, stop };
  const gameStart = useCallback(() => actionsRef.current.toggle(), []);
  const gameStop = useCallback(() => actionsRef.current.stop(), []);
  useLayoutEffect(() => {
    if (state === 'playing') return;
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
    onSectionSeek,
    state,
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
  const [launchDock, setLaunchDock] = useState(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setLaunchDock(document.getElementById(media.matches ? 'mobile-cruise-launch' : 'desktop-cruise-launch'));
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const practicePlayLaunch = <div className="practice-play-launch" data-playback-state={state}>
        {!gameMode && <button
          ref={playButton}
          className="practice-play-button"
          type="button"
          title="Follow the bouncing ball along the fretboard as the chords play."
          onClick={toggle}
          disabled={state === "starting" || (gameMode && !gameReady)}
        >
          <span className="practice-play-sparkle" aria-hidden="true">♫</span>
          <strong>{state === "starting" ? (
            <>
              <span className="spinner" aria-hidden="true" /> Loading sounds…
            </>
          ) : state === "playing" ? (
            "Ⅱ Pause"
          ) : state === "paused" ? (
            "▶ Resume"
          ) : (
            "▶ Cruise the chords"
          )}</strong>
          <span className="practice-play-sparkle practice-play-boat" aria-hidden="true">🚤</span>
        </button>}
      </div>;
  const TransportSettings = gameMode ? 'details' : 'div';
  const gamePlayControls = <div className="game-start-controls game-simple-start"><p>Plug in and play <span aria-hidden="true">♫</span></p><button ref={playButton} className="game-play-button" type="button" disabled={state === 'starting'} onClick={requestGamePlay}><span aria-hidden="true">{state === 'playing' ? 'Ⅱ' : '▶'}</span><strong>{state === 'starting' ? 'GETTING READY…' : state === 'playing' ? 'PAUSE GAME' : state === 'paused' ? 'KEEP PLAYING' : 'LET’S PLAY!'}</strong></button></div>;
  return (
    <section
      className={`player${gameMode ? ' is-game-mode' : ''}`}
      aria-label="Chord playback"
      aria-busy={state === "starting"}
    >
      {gameMode && <GameAtmosphere playing={state === 'playing'} />}
      {gameMode && <GameCountIn beat={countInBeats} go={countInGo} beatSeconds={60 / bpm} starting={state === 'starting'} paused={state === 'paused'} firstChord={firstGameChord?.chord} nextChord={nextGameChord?.chord} firstShape={gameNodeShapes[firstGameChord?.nodeId]} firstNode={songData.nodes.find(node => node.id === firstGameChord?.nodeId)} firstColor={timelineColor(routeColors[firstGameChord?.index], darkMode)} darkMode={darkMode} />}
      {gameMode && state === 'stopped' && <GameTempoOptions bpm={bpm} onChange={setBpm} />}
      {gameMode && gamePlayControls}
      {gameMode && <GameMode ref={gameRef} onStart={gameStart} onToggle={gameStart} onStop={gameStop} timeline={timeline} songData={songData} darkMode={darkMode} playbackState={state} seekVersion={seekVersion} loopIteration={loopIteration} selectionControls={selectionControls} bpm={bpm} onTempoChange={setBpm} getPosition={gamePosition} canJudge={canJudgeGame} onReady={setGameReady} onJudgment={handleGameJudgment} />}
      {gameMode && <div ref={progressRef} className="game-header-anchor" aria-hidden="true" />}
      {!gameMode && <TransportSettings className="game-accompaniment-settings">
      {gameMode && <summary>Tempo & backing sound</summary>}
      {launchDock ? createPortal(practicePlayLaunch, launchDock) : practicePlayLaunch}
      <div className="transport">
        <button
          className="transport-play-toggle"
          type="button"
          onClick={toggle}
          disabled={state === 'starting'}
        >
          {state === 'starting' ? 'Loading…' : state === 'playing' ? 'Ⅱ Pause' : state === 'paused' ? '▶ Resume' : '▶ Play'}
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
            value={gameMode ? 30 : volume}
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
      </TransportSettings>}
      {!gameMode && <div className="player-status">
        {gameMode && countInBeats > 0 && <strong className="game-count-in">{countInLabel(countInBeats, 60 / bpm)}</strong>}
        <span>
          {running && active
            ? `${active.section ? active.section + " · " : ""}Bar ${Math.floor((position * bpm) / (60 * timeline.beatsPerBar)) + 1} of ${timeline.beats / timeline.beatsPerBar}`
            : `${timeline.beats / timeline.beatsPerBar} bars · ${Math.round(timeline.duration)} seconds`}
        </span>
      </div>}
      {!gameMode && <div className="main-chord-preview full-fretboard-preview">
        {songData.nodeColorMode === 'quality' && <ChordQualityLegend darkMode={darkMode} />}
        <ShellChordDiagram
          instrument={songData.instrument}
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
        onSeek={seekAndPlay}
      />}
      <MiniProgress
        songId={song}
        songOptions={songOptions}
        onSongChange={onSongChange}
        instrument={songData.instrument}
        key={gameMode ? 'game' : 'practice'}
        gameMode={gameMode}
        gameReady={gameReady}
        wholeFretboard={wholeFretboard}
        onToggleWholeFretboard={onToggleWholeFretboard}
        nodeColorMode={songData.nodeColorMode}
        currentEvent={active}
        currentNode={currentNode}
        gameHasStarted={gameHasStarted}
        nextEvent={nextGameTarget}
        nextNode={nextGameNode}
        showFullPath={showFullPath}
        showGuideLines={showGuideLines}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={onToggleAutoScroll}
        twoStrings={twoStrings}
        setTwoStrings={setTwoStrings}
        onToggleFullPath={onToggleFullPath}
        onToggleGuideLines={onToggleGuideLines}
        playbackState={state}
        onToggle={gameMode ? requestGamePlay : toggle}
        onStop={stop}
        progressRef={progressRef}
        timeline={timeline}
        sectionSegments={sectionSegments}
        position={position}
        disabled={state === "starting"}
        onSeek={seekAndPlay}
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
        disabled={state === "starting"} onSeek={seekAndPlay} />}
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
