# Chapter notes and selected-area inspector

`ChapterNotes` preserves the atlas heading, notes sections, scrollable body and
source footer. Its optional `selectedArea` slot adds a Selected area section.
`selectionKey` identifies deliberate selection/clear events. A new selection
opens Selected area; clearing returns to Overview. Year changes do not interrupt
the reader's chosen notes section. Other chapters keep their existing notes.

`NightLightsInspector` uses the existing book `renderInspector` slot through
`useBookVisualization`. Coordinates and year share the hook's per-chapter state
with the map and survive flips/cover closure until refresh. No new global store,
book geometry, transition code, shared scientific model or audio mapping is added.

The adapter's `getNightLightsArea` derives the current sample, twelve-year series,
cell bounds and 2012 comparison from the same grid cell. Fractional slider
positions use the nearest actual year. Values are normalized video-derived
brightness, not radiance or an exact pin measurement. Detailed images are not
sampled for these numbers.

Missing coverage stays null, valid zero stays zero, and partial coverage retains
its value with a note and hollow chart point. Differences require full coverage
in both years and are scale units, not percentage changes. The chart uses straight
segments on a fixed 0–1 domain with gaps for missing data. An expandable semantic
table supplies all values and coverage for keyboard and screen-reader access.

The UI inherits book typography and ink, muted text, cyan, paper and rule tokens.
It uses dividers and typographic hierarchy rather than a separate card system.
It scrolls within the right page without remounting the map.
