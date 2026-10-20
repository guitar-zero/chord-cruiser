import { pianoLayout } from './data/pianoLayout.js';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import ChordPlayer from "./ChordPlayer.jsx";
import AutoScrollToggle from "./AutoScrollToggle.jsx";
import useTheme from "./hooks/useTheme.js";
import IndicatorLaunch from "./IndicatorLaunch.jsx";
import ChartSections from "./ChartSections.jsx";
import SectionPipe from "./SectionPipe.jsx";
import { outgoingVisitColors } from "./SongChart.jsx";
import { chordQualityColor } from "./data/chordQualityColors.js";
import { timelineColor } from "./data/timelinePresentation.js";
import {
  isPlaybackAdvance,
  retainTransitionPipe,
} from "./data/playbackTransition.js";
import { scrollChartSections } from "./data/sectionScroll.js";
import { pipeProgress, beatCountdown } from "./audio/pipeProgress.js";
import { rapidPassage } from "./data/graphPresentation.js";
import { shortcutKey } from "./keyboardShortcuts.js";
import { exportAllSections } from "./exportAllSections.js";
import { printChart } from "./printChart.js";
import { songs, songsById } from "./data/songs.js";
import { popularSongIds, popularSongIdsSet } from "./data/popularSongs.js";
import { chartTarget } from "./audio/chartTarget.js";
import {
  keyRoots,
  minorKeyRoots,
  displayNote,
  transposeSong,
  notePitch,
} from "./data/transpose.js";
import { redStartingColor } from "./data/routePalette.js";
import { stackSharedNodes } from "./data/stackSharedNodes.js";
import { threeStringLayout } from "./data/threeStringLayout.js";
import { twoStringLayout } from "./data/stringLayout.js";
import { fullFretboardLayout } from "./data/fullFretboardLayout.js";

const dropdownSongs = [
  ...popularSongIds.map(id => songsById[id]),
  ...songs.filter(song => !popularSongIdsSet.has(song.id)),
];
const songOptionLabel = (song) => {
  const bars = song.playback.reduce((total, event) => total + event.bars, 0);
  return `${popularSongIdsSet.has(song.id) ? '★ ' : ''}${song.title} · ${bars} ${bars === 1 ? "bar" : "bars"}`;
};

function App() {
  const [chartOpen, setChartOpen] = useState(false);
  const gameMode = false;
  const [countInActive, setCountInActive] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [darkMode, setDarkMode] = useTheme();
  const [songId, setSongId] = useState("all-of-me");
  const [loadingSongId, setLoadingSongId] = useState(null);
  const songChangeFrame = useRef(null);
  useEffect(() => () => cancelAnimationFrame(songChangeFrame.current), []);
  const [targetKey, setTargetKey] = useState("");
  const [instrument, setInstrument] = useState('guitar');
  const [hiddenGuidesByInstrument, setHiddenGuidesByInstrument] = useState({ guitar: false, piano: true });
  const hideGuidingLines = hiddenGuidesByInstrument[instrument];
  const setHideGuidingLines = useCallback(update => {
    setHiddenGuidesByInstrument(previous => ({
      ...previous,
      [instrument]: typeof update === 'function' ? update(previous[instrument]) : update,
    }));
  }, [instrument]);
  const [showFullPathDuringPlayback, setShowFullPathDuringPlayback] =
    useState(true);
  useEffect(() => {
    function handleShortcut(event) {
      const key = shortcutKey(event);
      if (key === "b") {
        event.preventDefault();
        setAutoScrollEnabled(enabled => !enabled);
      }
      if (key === "v") {
        event.preventDefault();
        setShowFullPathDuringPlayback((value) => !value);
      }
      if (key === "w") {
        event.preventDefault();
        setDarkMode((value) => !value);
      }
      if (key === ",") {
        event.preventDefault();
        setHideGuidingLines((value) => !value);
      }
      if (key === "m") {
        event.preventDefault();
        setTwoStrings((value) => !value);
      }
      if (key === "n" && instrument === 'guitar') {
        event.preventDefault();
        setWholeFretboard((value) => !value);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [setHideGuidingLines, instrument]);
  const [twoStrings, setTwoStrings] = useState(true);
  const [wholeFretboard, setWholeFretboard] = useState(false);
  const useSmallGutters = instrument === 'guitar' && wholeFretboard;
  const [search, setSearch] = useState("");
  const filteredSongs = dropdownSongs.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()),
  );
  const [flight, setFlight] = useState(null);
  const launchFinished = useRef(null);
  const finishLaunch = useCallback(() => {
    setFlight(null);
    launchFinished.current?.();
    launchFinished.current = null;
  }, []);
  const [playback, setPlayback] = useState(null);
  const [indicatorArrival, setIndicatorArrival] = useState(null);
  const [sectionBridge, setSectionBridge] = useState(null);
  const svgRef = useRef(null);
  const playerRef = useRef(null);
  const sectionsRef = useRef(null);
  const playbackClockRef = useRef(null);
  const handlePlaybackPosition = useCallback((clock) => {
    playbackClockRef.current = clock;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const { phase } = beatCountdown(clock);
    const accent = reduced ? 0 : Math.exp(-phase * 6);
    const pulse = 1 + 0.35 * accent;
    document
      .querySelectorAll(
        "[data-playback-pipe], .pipe-preview-fill, .section-pipe-preview, .turnaround-pipe",
      )
      .forEach((path) => {
        if (path.hasAttribute("data-playback-pipe")) {
          const progress = path.dataset.turnaroundPipe
            ? 1
            : pipeProgress(
                Number(path.dataset.playbackPipe),
                clock,
                Number(path.dataset.pipeSeekVersion),
              );
          path.setAttribute("stroke-dashoffset", String(1 - progress));
        }
        const baseWidth = Number(
          path.dataset.beatBaseWidth ||
            path.dataset.beatPulseWidth ||
            path.getAttribute("stroke-width"),
        );
        path.dataset.beatPulseWidth = String(baseWidth);
        path.setAttribute("stroke-width", String(baseWidth * pulse));
        path.style.filter = "none";
      });
  }, []);
  const song = useMemo(() => {
    const transposed = transposeSong(songsById[songId], targetKey);
    const positioned = instrument === 'piano' ? pianoLayout(transposed) : twoStrings
      ? twoStringLayout(transposed)
      : threeStringLayout(transposed);
    const chart = { ...redStartingColor(
      instrument === 'piano' || twoStrings ? positioned : stackSharedNodes(positioned),
    ), nodeColorMode: 'quality' };
    const displayed = instrument === 'guitar' && wholeFretboard ? fullFretboardLayout(chart) : chart;
    return { ...displayed, layout: { ...displayed.layout, noGutters: useSmallGutters } };
  }, [songId, targetKey, twoStrings, instrument, wholeFretboard, useSmallGutters]);
  const selectionKey = `${songId}:${song.key}:${instrument}`;
  useEffect(() => setChartOpen(false), [selectionKey]);
  const visitColors = useMemo(() => outgoingVisitColors(song), [song]);
  const availableKeys = /minor|-$/.test(song.key) ? minorKeyRoots : keyRoots;
  const handleChordChange = useCallback(
    (value) => {
      setPlayback(value && { ...value, key: song.key });
      if (!value) setFlight(null);
    },
    [song.key],
  );
  const target = chartTarget(
    songId,
    playback?.song === songId && playback?.key === song.key
      ? playback.event
      : null,
  );
  const currentChord = target && {
    ...target,
    visitIndex: playback?.visitIndex,
    seekVersion: playback?.seekVersion,
    loopIteration: playback?.loopIteration,
    isPlaying: playback?.isPlaying,
  };
  const previousChord = useRef(null);
  useLayoutEffect(() => {
    const old = previousChord.current;
    const next = currentChord && {
      ...currentChord,
      section: song.nodes.find((node) => node.id === currentChord.node)
        ?.section,
    };
    previousChord.current = next;
    // A seek or a short chord can advance playback before the flight lands.
    if (flight?.destination) finishLaunch();
    const advancing = isPlaybackAdvance(old, next, song.playback.length);
    const looping = advancing && next.visitIndex === 0;
    if (
      !next?.section ||
      !old?.section ||
      (next.section === old.section && !looping)
    )
      return;
    const findShape = (nodeId) =>
      [...sectionsRef.current.querySelectorAll("[data-node-id]")]
        .find((node) => node.dataset.nodeId === nodeId)
        ?.querySelector("[data-node-shape]");
    const source = findShape(old.node);
    const destination = findShape(next.node);
    const panel = destination?.closest(".chart-section");
    if (!panel) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const sourceBounds = source?.getBoundingClientRect();
    if (autoScrollEnabled && advancing) scrollChartSections(source?.closest(".chart-section"), panel);
    if (!reducedMotion && sourceBounds && advancing) {
      const targetBounds = destination.getBoundingClientRect();
      setFlight({
        from: {
          x: sourceBounds.x + sourceBounds.width / 2 + window.scrollX,
          y: sourceBounds.y + sourceBounds.height / 2 + window.scrollY,
        },
        documentCoordinates: true,
        source,
        destination,
        followLine: true,
        fromSize: Math.max(sourceBounds.width, sourceBounds.height) + 32,
        size: Math.max(targetBounds.width, targetBounds.height) + 32,
      });
    }
  }, [
    song,
    currentChord?.node,
    currentChord?.visitIndex,
    currentChord?.seekVersion,
    currentChord?.loopIteration,
    autoScrollEnabled,
  ]);
  useLayoutEffect(() => {
    // Retain the preview during the section flight, then remove it on landing.
    if (
      retainTransitionPipe(
        sectionBridge,
        currentChord,
        indicatorArrival,
        song.playback.length,
        Boolean(flight),
      )
    )
      return;
    const landed =
      !flight &&
      currentChord &&
      indicatorArrival?.node === currentChord.node &&
      indicatorArrival?.visitIndex === currentChord.visitIndex &&
      indicatorArrival?.seekVersion === currentChord.seekVersion;
    const source =
      landed && song.nodes.find((node) => node.id === currentChord.node);
    const looping =
      landed && currentChord.visitIndex === song.playback.length - 1;
    const nextEvent =
      landed && song.playback[looping ? 0 : currentChord.visitIndex + 1];
    const destination =
      nextEvent && song.nodes.find((node) => node.id === nextEvent.nodeId);
    if (
      !source ||
      !destination ||
      source.id === destination.id ||
      (source.section === destination.section && !looping)
    ) {
      setSectionBridge(null);
      return;
    }
    const color = timelineColor(
      song.nodeColorMode === 'quality' ? chordQualityColor(nextEvent.chord) : visitColors[currentChord.visitIndex],
      darkMode,
    );
    setSectionBridge((old) =>
      old?.sourceId === source.id &&
      old?.targetId === destination.id &&
      old?.visitIndex === currentChord.visitIndex &&
      old?.seekVersion === currentChord.seekVersion &&
      old?.color === color
        ? old
        : {
            sourceId: source.id,
            targetId: destination.id,
            visitIndex: currentChord.visitIndex,
            seekVersion: currentChord.seekVersion,
            loopIteration: currentChord.loopIteration,
            color,
          },
    );
  }, [
    song,
    currentChord?.node,
    currentChord?.visitIndex,
    currentChord?.seekVersion,
    currentChord?.loopIteration,
    indicatorArrival,
    flight,
    sectionBridge,
    visitColors,
    darkMode,
  ]);
  function launchIndicator(nodeId, rect, event, timing) {
    const shape = [...sectionsRef.current.querySelectorAll("[data-node-id]")]
      .find((node) => node.dataset.nodeId === nodeId)
      ?.querySelector("[data-node-shape]");
    const sectionId =
      song.nodes.find((node) => node.id === nodeId)?.section || event?.section;
    const sectionSvg = [
      ...sectionsRef.current.querySelectorAll("svg[data-section-id]"),
    ].find((svg) => svg.dataset.sectionId === sectionId);
    const panel =
      shape?.closest(".chart-section") ||
      sectionSvg?.closest(".chart-section") ||
      sectionsRef.current.querySelector(".chart-section");
    if (autoScrollEnabled) scrollChartSections(null, panel);
    if (
      !shape ||
      !rect ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const bounds = shape.getBoundingClientRect();
    return new Promise((resolve) => {
      launchFinished.current = resolve;
      setFlight({
        from: {
          x: rect.x + rect.width / 2 + window.scrollX,
          y: rect.y + rect.height / 2 + window.scrollY,
        },
        documentCoordinates: true,
        destination: shape,
        progress: timing?.progress,
        emergeFraction: timing?.emergeFraction,
        size: Math.max(bounds.width, bounds.height) + 32,
      });
    });
  }
  function jumpToSection(sectionId) {
    setChartOpen(false);
    const sectionSvg = [...(sectionsRef.current?.querySelectorAll('svg[data-section-id]') || [])]
      .find(svg => svg.dataset.sectionId === sectionId);
    scrollChartSections(null, sectionSvg?.closest('.chart-section'));
  }
  function changeSong(id) {
    playerRef.current?.stop();
    finishLaunch();
    setPlayback(null);
    if (id === songId || !songsById[id]) return;
    setLoadingSongId(id);
    cancelAnimationFrame(songChangeFrame.current);
    // Allow the loading indicator to paint before constructing the next chart.
    songChangeFrame.current = requestAnimationFrame(() => {
      songChangeFrame.current = requestAnimationFrame(() => {
        startTransition(() => {
          setTargetKey("");
          setSongId(id);
          setLoadingSongId(null);
        });
      });
    });
  }
  function changeKey(key) {
    playerRef.current?.stop();
    finishLaunch();
    setPlayback(null);
    setTargetKey(key);
  }
  function downloadSvg() {
    const clone = exportAllSections(
      song,
      sectionsRef.current.querySelectorAll("svg[data-section-id]"),
      darkMode,
    );
    clone
      .querySelectorAll("rect")
      .forEach((rect) => rect.style.removeProperty("transition"));
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${song.id}-${song.key.replaceAll(" ", "-")}-all-sections.svg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className={useSmallGutters ? 'without-gutters' : undefined}>
      {loadingSongId && <div className="song-loading-toast" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        Loading {songsById[loadingSongId].title}…
      </div>}
      <header>
        <div>
          <p className="eyebrow">CHORD CRUISER</p>
          <p className="brand-tagline">Visual backing track</p>
          <h1>{song.title}</h1>
          <p className="subtitle">In {song.key}</p>
          {song.playbackNote && <p className="note">{song.playbackNote}</p>}
          <p className="note shell-footnote">
            Chords are shown as shell chords with the appropriate seventh
            implied; simplified labels omit some extensions.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="theme-toggle"
            type="button"
            aria-keyshortcuts="w"
            title="Toggle light/dark mode (W)"
            aria-pressed={darkMode}
            onClick={() => setDarkMode((value) => !value)}
          >
            {darkMode ? "Light mode" : "Dark mode"} <span aria-hidden="true">{darkMode ? "☀" : "☾"}</span>
          </button>
          <button className="download" type="button" onClick={downloadSvg}>
            Download as SVG <span aria-hidden="true">↗</span>
          </button>
          <button className="download" type="button" onClick={() => {
            if (!printChart(song, sectionsRef.current.querySelectorAll('svg[data-section-id]'))) {
              window.alert('Allow popups for this site to open the chart print preview.');
            }
          }}>Print sections <span aria-hidden="true">🖨</span></button>
        </div>
      </header>
      <nav className="song-picker" aria-label="Choose a song">
        <label htmlFor="song-search">
          Find a song{" "}
          <input
            id="song-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title…"
          />
        </label>
        <label htmlFor="song-select">
          Song{" "}
          <select
            id="song-select"
            value={songId}
            onChange={(event) => {
              changeSong(event.target.value);
              event.currentTarget.blur();
            }}
          >
            {!filteredSongs.some((item) => item.id === songId) && (
              <option value={songId}>{songOptionLabel(song)}</option>
            )}
            {filteredSongs.map((item) => (
              <option key={item.id} value={item.id}>
                {songOptionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="key-select">
          Key{" "}
          <select
            id="key-select"
            value={targetKey}
            onChange={(event) => changeKey(event.target.value)}
          >
            <option value="">{songsById[songId].key}</option>
            {availableKeys
              .filter(
                (root) => notePitch(root) !== notePitch(songsById[songId].key),
              )
              .map((root) => (
                <option key={root} value={root}>
                  {displayNote(root)}
                  {/minor|-$/.test(song.key) ? " minor" : ""}
                </option>
              ))}
          </select>
        </label>
        <label>Instrument <select value={instrument} onChange={event => setInstrument(event.target.value)}><option value="guitar">Guitar</option><option value="piano">Piano</option></select></label>
        <div className="chart-display-controls">
          <div className="chart-toggle-group" role="group" aria-label="Default display options">
          <button className="theme-toggle full-progression-toggle" type="button" aria-keyshortcuts="v" title="Toggle full progression (V)" aria-pressed={showFullPathDuringPlayback} onClick={() => setShowFullPathDuringPlayback(value => !value)}>Full progression <kbd>V</kbd></button>
          <button
            className="theme-toggle"
            type="button"
            aria-keyshortcuts=","
            title="Toggle guidelines (,)"
            aria-pressed={!hideGuidingLines}
            onClick={() => setHideGuidingLines((value) => !value)}
          >
            Guidelines{" "}
            <kbd>,</kbd>
          </button>
          <AutoScrollToggle enabled={autoScrollEnabled} onToggle={() => setAutoScrollEnabled(enabled => !enabled)} />
          </div>
          <div className="chart-toggle-group" role="group" aria-label="Additional display options">
          <button className="theme-toggle" type="button" disabled={instrument === 'piano'} aria-keyshortcuts="n" aria-pressed={wholeFretboard} title="Toggle frets 1–12 on the current map’s strings (N)" onClick={() => setWholeFretboard(value => !value)}>12 frets <kbd>N</kbd></button>
          <button
            disabled={instrument === "piano"}
            className="string-toggle theme-toggle"
            type="button"
            aria-keyshortcuts="m"
            title="Toggle 2/3 strings (M)"
            aria-pressed={!twoStrings}
            onClick={() => setTwoStrings((value) => !value)}
          >
            Show D string{" "}
            <kbd>M</kbd>
          </button>
          <button className="theme-toggle" type="button" aria-keyshortcuts="c" aria-haspopup="dialog" aria-pressed={chartOpen} onClick={() => setChartOpen(open => !open)} title="View full chart (C)">View Full Chart <kbd>C</kbd></button>
          </div>
        </div>
      </nav>
      <ChordPlayer
        songOptions={dropdownSongs}
        onSongChange={changeSong}
        gameMode={gameMode}
        chartOpen={chartOpen}
        setChartOpen={setChartOpen}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={() => setAutoScrollEnabled(enabled => !enabled)}
        showFullPath={showFullPathDuringPlayback}
        showGuideLines={!hideGuidingLines}
        onToggleFullPath={() =>
          setShowFullPathDuringPlayback((value) => !value)
        }
        twoStrings={twoStrings}
        setTwoStrings={setTwoStrings}
        wholeFretboard={wholeFretboard}
        onToggleWholeFretboard={() => setWholeFretboard(value => !value)}
        onToggleGuideLines={() => setHideGuidingLines((value) => !value)}
        selectionControls={<div className="game-song-selection">
          <label>Song<select value={songId} onChange={event => {
            changeSong(event.target.value);
            event.currentTarget.blur();
          }}>{dropdownSongs.map(item => <option key={item.id} value={item.id}>{songOptionLabel(item)}</option>)}</select></label>
          <label>Key<select value={targetKey} onChange={event => changeKey(event.target.value)}>
            <option value="">{songsById[songId].key}</option>
            {availableKeys.filter(root => notePitch(root) !== notePitch(songsById[songId].key)).map(root => <option key={root} value={root}>{displayNote(root)}{/minor|-$/.test(song.key) ? ' minor' : ''}</option>)}
          </select></label>
        </div>}
        ref={playerRef}
        song={songId}
        songData={song}
        darkMode={darkMode}
        onPlaybackLaunch={launchIndicator}
        onChordChange={handleChordChange}
        onCountInChange={setCountInActive}
        onPlaybackPosition={handlePlaybackPosition}
        onSectionSeek={jumpToSection}
      />
      <div ref={sectionsRef}>
        <ChartSections
          hideOtherNodes={!showFullPathDuringPlayback && Boolean(currentChord)}
          playbackClockRef={playbackClockRef}
          onNodeClick={nodeId => playerRef.current?.seekToNode(nodeId)}
          onIndicatorArrival={setIndicatorArrival}
          suppressBeatDots={countInActive}
          suppressIndicator={Boolean(flight)}
          hideGuidingLines={hideGuidingLines}
          columns={1}
          key={`${selectionKey}:${twoStrings}`}
          ref={svgRef}
          song={song}
          darkMode={darkMode}
          currentChord={currentChord}
        />
      </div>
      {sectionBridge && (
        <SectionPipe
          key={`${sectionBridge.sourceId}:${sectionBridge.visitIndex}:${sectionBridge.seekVersion}`}
          bridge={sectionBridge}
          sectionsRef={sectionsRef}
          playbackClockRef={playbackClockRef}
          autoScrollEnabled={autoScrollEnabled}
          fullHighlight={Boolean(rapidPassage(song, currentChord?.visitIndex))}
        />
      )}
      <IndicatorLaunch flight={flight} onComplete={finishLaunch} />
      <footer>
        A movement map based on{" "}
        <a href={song.sourceUrl} target="_blank" rel="noreferrer">
          the source chart
        </a>
        . {song.footerNote}
      </footer>
    </main>
  );
}

// Reuse the root across Vite updates; recreating it leaves orphaned app/audio
// instances and can accumulate headers in the same container.
const container = document.getElementById("root");
const root = import.meta.hot?.data.root || createRoot(container);
if (import.meta.hot) {
  import.meta.hot.data.root = root;
  import.meta.hot.accept();
}
root.render(<App />);
