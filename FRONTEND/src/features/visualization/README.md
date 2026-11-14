# Visualization — FE B

FE B owns this feature. Follow [the project guideline](../../../guideline/README.md)
before adding implementation. Globe and map foundations are integrated through the book’s visualization slot. Scientific layers and media playback remain unimplemented.

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

`VisualizationHost.tsx` adapts `BookSlotProps` to viewer props: Night Lights is map-only with Blue Marble January 2004; Ocean defaults to globe and supports map; CO2 is globe-only with Blue Marble. `BookChapter.viewer` is the default and optional `supportedViews` lists permitted geographic views. These are presentation contracts, not scientific data contracts.

`useBookVisualization.tsx` owns per-chapter view/coordinate state above the disposable slots. App supplies it through `BookExperience.bookProps`. State survives flips and cover closing, and resets on refresh. Only the active viewer mounts; switching view resets local camera/pan/zoom but retains coordinates. Both `!isActive` and `interactionDisabled` lock the viewer. The existing shell unmounts scenes during flips and while closed.

`embedded` enables compact viewer presentation: plain lower-right coordinates, lower-left −/+ zoom tools, drag/select hints, an optional coordinate-entry popover, and a separate image-source link. The host CSS uses the atlas palette; no page geometry changes. Globe drawing buffers are preserved so existing DOM snapshots can copy the outgoing scene without a second Canvas. Verify snapshot appearance and performance in the presentation browser.

Future layers use the existing globe R3F `layers(context)` or map SVG `layers(context)` callback. Resolve coordinates through Data's future adapter before supplying measurements or Sound. Current ready state means a usable reference viewer only; no chapter layer or numerical dataset is claimed. The right-page notes remain explanatory; audio is unchanged and disabled.
