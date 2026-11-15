# Night Lights Globe / Map host

`NightLightsVisualization` owns data/image loading, annual controls and status
above the renderer branch. Map remains the default; the book's existing view
state remembers Globe/Map, selected coordinates and year until refresh. One
viewer mounts at a time. Switching resets local navigation like Ocean and CO₂,
while retaining the year, location, pin and selected-area inspector. Rotation
alone never selects a location. There is no autoplay or independent timeline.

The former `map/NightLightsMap` entry point remains a standalone Map wrapper.
Both modes use the existing NASA 2012–2023 imagery and coarse brightness grid;
no new assets or scientific values are introduced. `yearBlend` chooses the same
adjacent images and fractional blend for Map and Globe. Inspector lookup remains
the nearest actual year and the same 2° × 2° area, including missing/partial data.

The existing loader now retains decoded annual images for the chapter lifetime.
Their temporary blob URLs are revoked after decode; pending fetches abort on
failure/unmount. Changing view does not reload the annual assets or dataset.

`globe/layers/NightLightsGlobeLayer` crossfades two decoded images on one native
2048 × 1024 canvas when the year changes. An sRGB CanvasTexture uses the existing
globe UV convention, with unlit, non-tone-mapped screen blending over the reference
surface dimmed by 86%, matching the map's composition. It never intercepts picking
and stays below the pin radius. Only one annual GPU texture is retained; renderer
unmount disposes it. R3F invalidation occurs on year changes; there is no extra
render loop. Camera interaction remains demand-rendered by the existing globe.

Source provenance stays in `public/media/night-lights/README.md` and
`public/data/night-lights/README.md`. Globe rendering adds no measurement precision.

Validation: run lint/build, the Night Lights adapter checks, globe/map coordinate
checks, and `node --experimental-strip-types --test src/features/visualization/night-lights/yearBlend.test.mjs`.
Browser acceptance still includes brightness/color parity, landmark orientation,
crossfades in both directions, selection/inspector continuity, keyboard/touch,
loading/retry, rapid switching, page snapshots and texture cleanup.
