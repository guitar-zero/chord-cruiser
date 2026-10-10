# Chord chart conventions

Every new chart must label chord nodes in progression order using the shared
`StepBadge` component, matching Solar: a small filled circle above the node,
with a readable white sequence number. Number visits in playback order across sections. Revisited nodes list every
visit index in the same badge; a multi-bar hold counts as one visit. Derive
these indices from playback JSON. When a source has multiple destinations,
its first destination uses the section default color; later destinations use
distinct colors, ordered by first traversal. Preserve those branch colors
when applying crossing/nearby-route coloring.

Keep distinct chord qualities as independent graph nodes even when they share
a root. Position these within the same string and fret, with adequate spacing.
Prefer direct straight arrows, including diagonals; detour only for clarity.
Use different colors for crossings or very close, similarly sloped lines.
Distinguish verse/chorus and first/second passes. End each edge with one small
triangle whose pointed tip remains visibly separated from the destination node.
Labels must never cover arrow tips. Use `data-chart-label` and the shared
`useArrowSafeLabels` hook to reserve space around the complete triangle.
Arrow shafts must be clearly thinner than the triangle's base; use the shared
renderer, which caps shaft width at six units for fifteen-unit triangle bases.
Do not add last-to-first loop arrows unless requested.

Read repeat symbols and split bars from the source chart. Use `DurationLabel`
for durations other than one bar, using ×2, ×3, ×4, etc. for held bars
and “half-bar” for half-bar changes. When a reused chord has different durations,
label the initial hold and later/turnaround duration explicitly. Do not count
a repeated bar as a new chord node.

Store songs in `src/data/*.json` and register them in `src/data/songs.js`.
Use `src/SongChart.jsx` for every chart; do not add per-song React components
or checked-in SVG copies. Playback events reference graph nodes by `nodeId`;
use null for source chords omitted from the simplified diagram. Preserve full
source qualities in playback and simplified display labels in nodes. Optional
edge paths preserve carefully arranged routes. SVG exports are generated from
the rendered chart on demand. Run tests and the production build after edits.

For reciprocal movements A → B and B → A, use parallel, spaced lanes
with different colors and a single destination arrow on each. Use the shared
`reciprocalRoutes` renderer helper; preserve obstacle-avoiding bends.
