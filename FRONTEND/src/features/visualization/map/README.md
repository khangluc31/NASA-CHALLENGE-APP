# Map viewer

FE B's reusable 2D geographic foundation. `MapViewer` uses an equirectangular
SVG surface with local pan/zoom, controlled coordinate selection and chapter
layer composition. No map dependency, measurement dataset or audio engine is
introduced. Book integration is provided by the feature-level VisualizationHost.

- Choose the projection and sampling behavior to match the verified dataset.
- Resolve geographic selection through the agreed data contract so the map,
  inspector and audio use the same sample, units and time reference.
- Respect transition locks and provide keyboard-accessible interaction and
  textual alternatives to color encodings.
- Reuse existing dependencies; justify a specialized map library if needed.

See [feature integration boundaries](../README.md).

## Public interface

Import `MapViewer` and its types from `./index`.

```tsx
<MapViewer
  selectedLocation={selectedLocation}
  onLocationSelect={setSelectedLocation}
  interactionLocked={interactionLocked}
  contentState={{ status: 'ready' }}
  layers={(context) => <ChapterLayer context={context} />}
  layerDescription="Provide the chapter's legend, units and missing-data explanation."
/>
```

- `selectedLocation` and `onLocationSelect` are caller-controlled. The callback
  reports latitude/longitude or `null` when cleared, never a measurement. Invalid
  coordinates are ignored. Without the callback, selection controls are omitted.
  Resolve coordinates using Data's agreed sampling contract before updating the
  inspector or Sound. Browsing and resetting the view never change selection.
- Keep the viewer's identity stable during same-chapter reading. Pan/zoom stays
  local and survives prop updates, including transition locks and content states.
  Unmount when replacing the active viewer; no global state is introduced.
- `interactionLocked` blocks navigation and coordinate selection. Loading a
  surface or chapter also locks interaction. `contentState` accepts `ready`,
  `loading`, `error`, `empty` or `missing`, with a caller-provided message for
  non-ready states. Only ready content renders chapter layers and permits
  selection. Chapter error/empty/missing states still permit reference browsing.
- `surfaceImage` defaults to the globe's bundled January 2004 Blue Marble image
  and its existing attribution. This historical context is not live imagery or
  the timestamp of chapter observations. Provenance is recorded in
  [the texture README](../../../../public/textures/README.md).
- Custom images use public-relative `path`, `attribution` and optional
  `sourceUrl`. Paths use `import.meta.env.BASE_URL`. They must be approved,
  complete 2:1 equirectangular world images, longitude −180 to +180 left to right,
  north at the top. Dimensions are checked; projection and geography must be
  verified by the asset owner. Image errors offer retry; stale image load results
  are ignored and handlers are released on replacement/unmount.
- `surfaceImage={null}` shows a labeled reference coordinate grid with no
  geographic imagery or scientific values.
- `layers(context)` returns **SVG elements**, inside the same transformed group
  as the surface. Context supplies `width`, `height`, `project`, `unproject`,
  `selectedLocation` and `interactionLocked`. Render components from `layers/`
  here, and call hooks inside those components rather than the callback.
  Layers must respect locks and release their subscriptions/resources. Decorative
  layers should use `pointerEvents="none"`; interactive layers should stop event
  propagation when handling a gesture themselves. The selection marker renders
  above chapter layers. Render failures show a map retry boundary.
- `layerDescription` supplies textual encoding explanations. Chapter integration
  must supply actual legends, units, dates, provenance and missing-data meaning.

## Projection and navigation

The reference map is 720 × 360 drawing units, not physical distance. Its origin
is the northwestern corner (90° N, 180° W); Greenwich/equator is (360, 180).
`locationToMapPoint` and `mapPointToLocation` provide the forward/inverse mapping.
Both antimeridian edges are supported. This projection distorts polar regions;
chapter assets with another projection require validated reprojection before use.
No raster sampling, tiled imagery or scientific reprojection is implemented.

Zoom is bounded to 1–8×. Pan is clamped to the image bounds with no horizontal
world wrapping. At 1× the full world is visible and panning has no effect. Drag
to pan, pinch to zoom, or focus the map and scroll to zoom around the pointer.
Wheel events outside the focused map retain page scrolling. Arrow keys pan,
+/− zoom and Home resets; buttons and a validated coordinate form provide
keyboard alternatives. A drag over five CSS pixels and multitouch gestures
cannot select a location. Selection is announced as text and marked by a
bright gold dot. Navigation is immediate without inertia or animations,
including for reduced-motion users. The SVG scales with the book page width.

## Structure

- `MapViewer.tsx`: composition, selection form, content states and attribution.
- `components/`: geographic surface, navigation, marker and error boundary.
- `hooks/`: local navigation and reference-image loading lifecycle.
- `utils/`: projection and bounded navigation helpers with focused checks.
- `layers/`: reserved for verified chapter visualizations; no invented overlays.

`MapLocation`, coordinate validation, content states and image metadata reuse
the existing globe viewer contracts. These are viewer interfaces, not a new
cross-feature dataset model. Shared contracts can be moved by the integration
owner when a viewer host is agreed.

## Verification

```sh
npm run lint
npm run build
node --experimental-strip-types --test src/features/visualization/map/utils/coordinates.test.mjs src/features/visualization/globe/utils/coordinates.test.mjs
```

The focused checks cover reference orientation, landmark round trips,
antimeridian/polar edges, invalid selections, zoom anchoring and navigation
bounds. On book integration, recheck pointer/touch/keyboard behavior, layer
alignment, transition locks, asset failure/retry, narrow layouts and repeated
chapter switches in the presentation browser. There is no development-only
preview route in the application.

## Book embedding

The optional `embedded` prop enables plain lower-right coordinate output and lower-left −/+ zoom tools, with a discreet coordinate-entry popover. The old navigation board is absent in the book; standalone viewers retain their full controls. The host supplies book-scoped layout styles and interaction locks. Selection and chosen view live above the slots; local camera/navigation reset on unmount. Reference backgrounds are not chapter measurements. See ../README.md for the current three-chapter contract.
