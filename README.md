# Chord map

A small React app displaying the ivory Take the A Train SVG alongside its chord routes. The routes follow the handwritten reference card, rather than transcribing every bar of the source lead sheet.

## Run

```sh
cd /Users/dpcairns/projects-with-codex/chord-map
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` to create a production build.

The chart component is `TakeTheATrain.jsx`; text routes and page layout are in `src/main.jsx`. The standalone downloadable SVG is in `public/take-the-a-train.svg`.

Playback uses a local Web Audio soft-piano synth, bass a perfect fifth below the root, and quiet brushes with Play/Pause, Stop,
tempo, volume, current chord, and bar progress. It follows original chart
qualities and durations, even when graph labels are simplified. Held chords
are quietly rearticulated once per bar. A Train plays the complete 32-bar form,
including its Gm7/C7 second ending, which is absent from the reference map.
Changing songs stops playback. Run `npm test` for timing and synthesis checks.

During playback, the orange outline follows the current chord and stays in
place when paused. Stop restores the start marker. Unmapped source-chart
chords (A Train's Gm7/C7 ending) temporarily hide the outline.

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
