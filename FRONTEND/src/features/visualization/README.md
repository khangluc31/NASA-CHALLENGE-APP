# Visualization — FE B

FE B owns this feature. Follow [the project guideline](../../../guideline/README.md)
before adding implementation. Globe and map foundations are integrated through the book’s visualization slot. Night Lights has annual imagery and a brightness inspector; Ocean and CO₂ use native NASA spherical video layers. Scientific data-to-sound mapping remains separate.

## Structure

```text
visualization/
  globe/       # R3F scenes, geographic picking, layers and camera controls
  map/         # 2D geographic viewers and interaction
  media/       # Image, video and frame-based viewers and interaction
```

The feature root will hold the viewer host and feature-local viewer contracts
when needed. Keep viewer-specific components and hooks inside their viewer
folder. Add common visualization controls or hooks here only when there is an
actual consumer; reuse existing shared UI rather than duplicating it.

## Integration boundaries

- FE A owns the book shell, chapter explanation, bookmarks and page transitions.
  The viewer belongs on the left page and must remain mounted during
  same-chapter reading or pagination.
- The integration owner owns `App.tsx`, `src/store/` and cross-feature contracts
  in `src/types/`. Coordinate those changes before implementation; do not copy
  the guideline's proposed contracts into a competing local data model.
- Data owns adapters, chapter metadata and provenance. Viewers consume validated
  samples and assets; they do not invent measurements or derive scientific
  values from colors without a validated mapping.
- FE B integrates audio controls and analyzer UI with Sound's agreed interface.
  Sound owns synthesis, mapping and engine lifecycle in `features/audio/`.
  Do not create an audio engine or independent playback timeline here.

## Implementation requirements

- Support the chapter's appropriate viewer rather than forcing every source
  onto a globe. Only the active viewer may own an expensive live 3D scene.
- Respect the book's interaction lock during transitions and show lightweight
  previews/loading until the next chapter is ready. Release old resources.
- Keep camera, hover and per-frame animation local. Publish deliberate selection
  changes through the agreed integration contract so the inspector and sound
  use the same sample. Rotation alone is not geographic selection.
- Provide loading, error, empty and missing-data states; keyboard controls,
  visible focus, reduced-motion behavior and textual encoding explanations.
- Use the agreed book styling. Do not introduce independent visual tokens.
- Static globe textures belong in `public/textures/`; approved previews/media in
  `public/media/`. Data assets belong to Data in `public/data/`. Create those
  folders when assets are available and use `import.meta.env.BASE_URL` paths.

Before integrating a viewer, agree its chapter, dataset, sampling rule and
selection/lifecycle interface with the relevant owners. After implementation,
run `npm run lint` and `npm run build`, then verify the affected interaction in
the browser and report actual results.

## Approved three-chapter integration

`VisualizationHost.tsx` adapts `BookSlotProps` to viewer props: Night Lights is map-only with Blue Marble January 2004 with topography/bathymetry; Ocean defaults to globe and supports map; CO2 is globe-only with Blue Marble. `BookChapter.viewer` is the default and optional `supportedViews` lists permitted geographic views. These are presentation contracts, not scientific data contracts.

`useBookVisualization.tsx` owns per-chapter view/coordinate state above the disposable slots. App supplies it through `BookExperience.bookProps`. State survives flips and cover closing, and resets on refresh. Only the active viewer mounts; switching view resets local camera/pan/zoom but retains coordinates. Both `!isActive` and `interactionDisabled` lock the viewer. The existing shell unmounts scenes during flips and while closed.

`embedded` enables compact viewer presentation: plain lower-right coordinates, lower-left −/+ zoom tools, drag/select hints, an optional coordinate-entry popover, with image attribution retained in the texture documentation. The host CSS uses the atlas palette; no page geometry changes. Globe drawing buffers are preserved so existing DOM snapshots can copy the outgoing scene without a second Canvas. Verify snapshot appearance and performance in the presentation browser.

Future layers use the existing globe R3F `layers(context)` or map SVG `layers(context)` callback. Resolve coordinates through Data's future adapter before supplying measurements or Sound. Current ready state means a usable reference viewer only; no chapter layer or numerical dataset is claimed. The right-page notes remain explanatory; audio is unchanged and disabled.

Night Lights update: its host now uses `NightLightsMap`, with validated annual
brightness grids, NASA detailed annual overlays, a continuous year scrubber and coordinate-to-cell lookup.
Ready state includes this video-derived visual proxy, not radiance measurements.
Other chapters retain reference-only viewers. Right-page content and the
independent demo audio remain unchanged. See `map/README.md` and
`public/data/night-lights/README.md` for extraction and display limitations.

## Compact controls refinement

All chapters display the current mode as text in the same upper-right overlay position. In Ocean, this is a borderless cyan text action that cycles Globe ↔ Map, with a hover/focus treatment and an accessible label naming the next view. Single-view chapters show a noninteractive label with the same spacing. The native button semantics remain for keyboard access; there is no segmented button group. The header passes pointer events through except on the mode action. Scene height is unchanged by mode availability.

Coordinate entry wraps its contents rather than filling the scene width. Numeric fields have a fixed 12ch width with internal scrolling for longer values, no native spinner, and modest padding. Select/Clear buttons fit their labels: Select aligns left and Clear aligns to the input column’s right edge. The field/button grid stays bounded by the viewer on narrow screens. Keyboard focus on the map/globe uses the atlas cyan; pointer focus shows no frame. Selection pins are flat red teardrops with contrasting centers. The globe pin is camera-facing, tip-anchored and hidden on the far side; both pins retain their screen size across zoom levels. The globe pin is approximately 22 CSS pixels tall, using camera depth and projection to compensate for zoom and viewport size without React state updates.

The visible background image-source link is removed from the book by agreement. Provenance remains in public/textures/README.md; chapter source links remain on the right page. Standalone viewers retain their full attribution and control interfaces.

The embedded scene background is black (`#000`) for both globe canvas surroundings and map viewport/reference-grid background, using the same host CSS variable. Both viewers use the locally optimized NASA January 2004 Blue Marble with topography and bathymetry. Its brighter ocean shading is part of the source image; it is not a chapter measurement layer or actual 3D relief. Texture/image and viewer-recovery retry buttons fit their labels with 5px/8px padding and a 30px minimum height. Texture retry remains disabled during transition locks.

Night Lights presentation refinement: the layer is always visible. A horizontal year scrubber crossfades adjacent NASA annual lights-only images from SVS 5276; JSON remains the coarse lookup source. Numeric descriptions are hidden from the visual controls. Host top-left reference labels and historical-background captions are removed; view switching remains upper-right. See public/media/night-lights/README.md.

Selected-area integration: `useBookVisualization` supplies the existing
`renderInspector` slot with `ChapterNotes` and its optional selected-area view.
Night Lights year and coordinates share feature-owned per-chapter state, without
a new global store, book slot or audio mapping. The pure `getNightLightsArea`
adapter derives current brightness, annual series and coverage-aware comparison.
Selections open the inspector, notes remain accessible, and Clear returns to
Overview. See `features/chapter/README.md`.

Ocean animation update: `VisualizationHost` mounts `OceanVisualization` above its
Globe/Map branch. Both views use one muted looping NASA video and one Play/Pause
control; switching view preserves the same media element and time. Default motion
starts when ready, with reduced-motion/autoplay fallbacks. Leaving the chapter or
closing the book releases the video; hidden browser tabs pause until explicit Play.
The JSON is not used for location measurements, and no Ocean selected-area view is
added. The video is the unmodified official 2048 × 1024 MP4 download; no external tools
or application dependencies were installed. See `ocean/README.md` and
`public/media/ocean/README.md` for lifecycle, provenance and resolution limits.

The high-resolution ocean media is a local Git-ignored asset because it exceeds
GitHub's normal file-size limit. Run `./scripts/download-ocean-video.ps1` after
cloning or before a deployment build. The built-in PowerShell script verifies its
checksum and installs nothing. The former low-resolution video has been removed.

CO₂ update: Chapter 1 uses the Science On a Sphere export at SVS 5436, the
geographically suitable version of SVS 5196, as an unmodified 4096 × 2048 local
video. Play/Pause, looping, reduced-motion handling and cleanup are shared with
Ocean through `media/`; both use `globe/layers/GlobeVideoLayer`. The original NASA
colorbar is shown in a compact legend disclosure. The globe remains interactive,
but the video supplies neither independent atmospheric depth nor local ppm
samples. No CO₂ selected-area inspector is introduced. See
`carbon-dioxide/README.md` and `public/media/carbon-dioxide/README.md`.
