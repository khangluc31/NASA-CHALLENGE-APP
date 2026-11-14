# Visualization — FE B

FE B owns this feature. Follow [the project guideline](../../../guideline/README.md)
before adding implementation. This scaffold defines module boundaries; viewers
and their integration contracts are not implemented yet.

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
