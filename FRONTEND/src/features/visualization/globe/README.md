# Globe viewer

FE B's home for React Three Fiber scenes, globe layers, geographic picking and
camera controls. `GlobeViewer` provides the reusable foundation with NASA Blue
Marble imagery as its default surface; no chapter measurement dataset is bundled.
Book integration is provided by the feature-level VisualizationHost. The temporary browser preview was removed after
manual testing; no development-only route is included.

- Scope the Canvas to the active viewer and keep its identity stable within a
  chapter. Respect the host's transition interaction lock.
- Keep camera and frame updates local; reuse geometries/materials and dispose
  manually owned resources. Consider capped DPR and instancing as needed.
- Document coordinate orientation and verify latitude/longitude conversion
  against known landmarks before connecting picking to scientific data.
- Rotation is not selection. Picked locations must resolve through the agreed
  data contract; missing samples must not become zero-valued measurements.
- Place approved static textures in `public/textures/` when available.

See [feature integration boundaries](../README.md).

## Public interface

Import `GlobeViewer` and its types from this folder's `index.ts`.

- Mount only the active viewer; keep its key stable during same-chapter reading.
  The Canvas stays mounted through interaction locks and content-state changes.
- `selectedLocation` and `onLocationSelect` are controlled by the caller. The
  callback reports coordinates or `null` when cleared, never a measurement.
  Without the callback, selection controls are omitted. Invalid external
  coordinates are ignored. Rotation and reset do not change selection.
- `interactionLocked` disables pointer, keyboard-button and form interactions.
- `surfaceTexture` accepts an approved equirectangular image's public-relative
  `path`, textual `attribution`, and optional `sourceUrl`. When omitted, it uses
  the bundled January 2004 Blue Marble with topography and bathymetry (2048 x 1024 JPEG, about 422 KiB).
  Paths use `import.meta.env.BASE_URL`.
  Images need longitude -180..180 from left to right and north at the top.
  Loading/errors block interaction; failed loads can be retried. Textures are
  disposed on replacement/unmount and late results are ignored/disposed.
- With `surfaceTexture={null}`, the surface is explicitly labeled an untextured reference
  sphere. Its wireframe and marker encode no scientific values.
- `contentState` supports ready/loading/error/empty/missing with caller-provided
  explanations. Only ready renders chapter layers and allows selection.
  Loading also locks camera navigation; other data states allow inspection of
  the reference surface. No missing measurement is converted to zero.
- `layers(context)` returns R3F elements: render chapter components here, with
  their implementation in `layers/`. Context supplies radius, selection and
  interaction lock. Invoke hooks inside those components, not inside this
  callback. Layers must respect the lock, use validated assets/samples, release
  their resources, and avoid intercepting surface picking unless intentional.
  Layer errors reach the viewer's retry boundary. No second Canvas is needed.
- `layerDescription` supplies a textual explanation of chapter encodings.
  Provide legends, units and missing-data descriptions at chapter integration.
- Camera distance is bounded to 1.5..6 globe radii. Pan, automatic rotation and
  inertia are disabled. Navigation is immediate, including for reduced-motion
  users. Rendering is on demand and DPR is capped at 1.5.
- Navigation buttons and a validated coordinate form provide keyboard access.
  Dragging beyond five CSS pixels cancels surface selection; non-primary and
  multitouch pointer starts cannot select. Selection is announced as text.
- WebGL failure/context loss displays an error/retry state. No audio engine,
  playback timeline, global store or dataset contract is introduced here.

## Default Earth surface

The approved surface is a cloud-free January 2004 composite, not live Earth
observations or the timestamp of an EIC chapter's data. It provides geographic
context beneath chapter layers. Topography and bathymetry shading is baked into the image; it does not supply actual 3D elevations, dynamic clouds,
street-level imagery or scientific sample values. Uniform illumination preserves
the image colors without a decorative day/night mask hiding chapter overlays.

See [texture provenance and processing](../../../../public/textures/README.md)
for the exact download URL, credits, image processing and checksum. The texture
is served locally, including offline demonstrations and subpath deployments.
Hosts can override the surface per chapter without changing layer coordinates.

## Coordinates and verification

Unit sphere: north is +Y, Greenwich at the equator is +X, and 90° east is -Z.
The default camera is at +Z, facing the western hemisphere. Layers must use
`locationToPosition` with this convention; picking uses the inverse conversion.
The radius is a rendering unit, not a claim about Earth's physical dimensions.

Run the focused geometry checks with Node 24:

```sh
node --experimental-strip-types --test src/features/visualization/globe/utils/coordinates.test.mjs
```

Checks cover axis orientation, Greenwich/Hanoi/Sydney/New York round trips,
antimeridian coordinates, invalid inputs and agreement with actual Three.js
sphere UVs. An approved texture still needs a visual landmark check when
integrated. Drag/zoom/touch, keyboard behavior, WebGL failures and repeated
mount/unmount should be checked again when integrating the globe into the book.

## Book embedding

The optional `embedded` prop enables plain lower-right coordinate output and lower-left −/+ zoom tools, with a discreet coordinate-entry popover. The old navigation board is absent in the book; standalone viewers retain their full controls. The host supplies book-scoped layout styles and interaction locks. Selection and chosen view live above the slots; local camera/navigation reset on unmount. Reference backgrounds are not chapter measurements. See ../README.md for the current three-chapter contract.

The Canvas preserves its drawing buffer for the book’s outgoing page snapshots. Check the performance tradeoff and visual continuity in the target browser; no second live scene is created.

The red globe marker is a camera-facing flat teardrop with a white center. Its tip anchors the location; the entire pin hides when its anchor rotates to Earth’s far side, and depth testing preserves surface occlusion. Focus the globe for arrow-key rotation, +/− zoom, or Home reset; dragging remains the pointer rotation control.

Pin scale is recalculated locally from camera-space depth, projection scale and canvas height to maintain about 22 CSS pixels of height when zooming. It stays tip-anchored and camera-facing. The book host supplies the black scene background; the historical Blue Marble texture includes NASA’s baked-in topography and bathymetry shading.
