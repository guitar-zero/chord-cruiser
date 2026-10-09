# Chord chart conventions

Every new chart must label chord nodes in progression order using the shared
`StepBadge` component, matching Solar: a small filled circle above the node,
with a readable white sequence number. Number by first appearance in the
displayed traversal; continue across sections. Revisited nodes keep their
number. Explain alternate routes with number sequences rather than renumbering
the same node on each pass.

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

After chart edits, regenerate the corresponding SVG in `public/` and any
existing standalone copy, and run the production build.
