# Chord map

A React app displaying all 201 Jazz Standard Repertoire songs, as guitar chord movement graphs with synchronized playback.

## Run

```sh
cd /Users/dpcairns/projects-with-codex/chord-map
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` to create a production build.

## Song data and rendering

Each song lives in `src/data/<song-id>.json`. `src/SongChart.jsx` renders all
charts dynamically; the same data supplies playback, the timeline, and current
chord highlighting. Download SVG exports the currently rendered chart, including
its label placement. No separate SVG file or React component is needed per song.

To add a song, create its JSON file and register its import in
`src/data/songs.js`. Use the existing files as examples:

- `nodes`: unique IDs, simplified chord labels, sequence numbers, string/fret
  anchors, and display coordinates. Different qualities get separate nodes.
- `edges`: source/target node IDs, section, pass number, and optional custom
  SVG path/color. Without a path, the renderer draws a direct connection.
- `beatsPerBar`: defaults to 4; Afro Blue and All Blues use 3 for timing,
  bar counters, piano/bass rearticulation, and the brush pattern.
- `playback`: ordered source chord symbols, duration in bars (including 0.5),
  section labels, and `nodeId`. Repeats are represented by their full duration;
  repeated visits reuse the same node ID. Null IDs hide the highlight for chords
  omitted from the simplified graph.
- `layout`: fret/string grids, section palettes, viewBox, and chart annotations.
- `durationLabels`: node-relative hold/split-bar labels and their placement.
- `routes`: node sequences and explanatory text for the sidebar.

Custom path coordinates preserve the existing carefully arranged diagrams.
Root anchors and display coordinates are separate so chords sharing a root can
have readable spacing within the same fret/string position. The downloader saves source images; the reviewed transcriptions supply JSON.


Playback uses a local Web Audio soft-piano synth, bass a perfect fifth below the root, and quiet brushes with Play/Pause, Stop,
tempo, volume, current chord, and bar progress. It follows original chart
qualities and durations, even when graph labels are simplified. Held chords
are quietly rearticulated once per bar. A Train plays the complete 32-bar form,
including its Gm7/C7 second ending and canonical altered dominants.
Songs loop to the beginning until paused or stopped. Changing songs stops playback. Run `npm test` for timing and synthesis checks.

During playback, the magenta flower follows the current chord and stays in
place when paused. Stop restores the start marker. Silent or unmapped source-chart intervals temporarily hide the indicator.

Sound preparation displays a spinner, yields between synthesized notes, and
caches prepared buffers for subsequent playback. Click or drag the orange
timeline to seek; keyboard arrow keys also work. Seeking cancels old scheduled
voices, rearticulates the current chord, and reschedules bass and drums from
that position. Seeking while paused preserves the paused state.

## Download source charts

Run the downloader in your normal macOS Terminal (outside the restricted agent
session). It uses Python 3 and the built-in `curl`; no Python packages or API
keys are required.

```sh
cd /Users/dpcairns/projects-with-codex/chord-map
python3 scripts/download_charts.py --all
```

Images, saved source pages, and `manifest.json` go into `chord-map/charts`.
The manifest records titles, source URLs, image URLs, local filenames, hashes,
and failures. Existing images are skipped; rerunning resumes a partial batch.
Use `--force` to refresh files. Individual failures do not stop the batch.

For selected songs, pass slugs or full song-page URLs:

```sh
python3 scripts/download_charts.py --song all-of-me blue-bossa solar
python3 scripts/download_charts.py --song https://standardrepertoire.com/all-of-me.html
python3 scripts/download_charts.py --all --limit 10
python3 scripts/download_charts.py --list
```

Use `--output /path/to/folder` to choose another destination. Requests are
sequential with a half-second delay; `--delay` adjusts this. Network errors
are retried. Downloaded responses are checked for an image signature before
being saved. The script downloads sources; it does not transcribe chords or
generate song components.

Downloader tests: `python3 -m unittest discover -s scripts -p 'test_download_charts.py'`.

## Rebuilding the first-ten batch

The nine newly added songs have reviewed, bar-by-bar source transcriptions in
`scripts/data/first-ten.json`. All Of Me keeps its previously refined JSON.
Comma-separated symbols split a bar equally. Consecutive identical symbols
within a panel become one held event. Optional source-chart alternatives are
omitted. Repeat sections and endings are expanded explicitly in playback order.

```sh
python3 scripts/build_song_graphs.py
```

The builder produces `src/data/<song>.json` with measured frets 5–9 on the low
E, A, and D strings. Each panel has its own graph nodes; repeated visits within
a panel reuse nodes. Qualities at the same root receive small horizontal
offsets, including enharmonic roots. Direct arrows are preferred; routes blocked
by other nodes receive orthogonal detours. Runtime coloring handles crossings
and branches. The browser still renders everything with `SongChart.jsx`.

Rerunning the builder replaces these nine generated JSON files, so edit the
transcriptions or generator for lasting changes. Tests check the first-ten
ordering, chart lengths, meter, voicings, and playback mappings.

Along Came Betty has a source discrepancy: the saved image has 34 written bars,
while its page metadata says 50. The JSON follows the image and records this
in `sourceNote`, shown in the app. No unmarked repeat is inserted.

## Rebuilding the complete catalogue

All 201 songs are searchable in the song picker. The additional source-chart
transcriptions live in `scripts/data/catalogue.txt`; `catalogue-index.json`
records the expected repertoire. Each line contains a song ID followed by named
sections. Commas split bars equally; `Chord@.25` specifies an explicit fraction
of a bar. `%` repeats the preceding bar and `@A` repeats the named section.
Repeats and endings are expanded into ordered playback events. Optional alternate
chords are omitted. `NC` preserves a silent chord interval while drums continue.
Take Five uses five beats per bar and 3+2 chord durations.

After downloading the source pages and manifest, rebuild with:

```sh
python3 scripts/build_song_graphs.py
python3 scripts/build_catalogue.py
npm test
npm run build
```

The catalogue builder validates each bar's durations and generates shared graph
JSON. Crowded sections split into smaller panels; long chord labels scale down.
Autumn Leaves and Take the A Train use canonical 32-bar transcriptions in
`scripts/data/catalogue.txt`, with the same measured panel layout as the other
songs. Autumn Leaves starts in G minor (relative major B♭); A Train starts in C.
Solar and All Of Me retain their hand-arranged layouts. Source/image length
mismatches are recorded in song notes. The transcriptions can be corrected in
the source data and rebuilt without editing React or generating saved SVGs.

## Transpose

Choose a destination in the **Key** selector; **Original** restores the source
key. Major/minor mode is preserved. The shared `src/data/transpose.js` transforms
chord roots and slash basses, playback audio, labels, and exported SVGs without
changing qualities or durations. Root anchors slide together along the same
strings, with updated **Fret N** labels. A nearby playable fret range is chosen
without crossing behind the nut. Changing the key stops playback and resets
the current-chord indicator; press Play to hear the new key. Source JSON remains
unchanged. Returning to a song defaults to its original key.

## Section layout

Every chart section is always visible. Both string modes use one chart per row. Three-string maps use expanded
fret spacing for more room between nodes. Playback highlights its active section
without changing section order or hiding other sections. Layout changes preserve
playback. Single-section songs occupy one grid cell.

The renderer crops each section from its measured coordinates, so legacy and
generated layouts use the same section grid. **Download section SVG** exports
the active section, or the first when stopped. Changing songs or keys stops
scheduled voices and resets transport.

The **Use 2 strings: E + A** button remaps the chart onto low E and A across
at least seven consecutive frets, expanding when needed. Root positions follow
playback order and favor the closest available fret/string to the preceding
chord; repeated roots retain their chosen anchor. Positions use string tuning;
chord qualities sharing a root stay on the same string/fret with separate
nodes. Routes are rebuilt around intervening nodes. Playback order, harmony,
and timing stay unchanged, including during playback. Toggle back to restore
the original three-string map. This display preference carries across songs
and works with transposition.
