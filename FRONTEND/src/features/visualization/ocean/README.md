# Ocean animation lifecycle

`OceanVisualization` mounts only for the ocean chapter, above the Globe/Map
branch. It owns one hidden, muted, inline, looping HTML video element. Switching
view replaces only the renderer and retains the same video, position and user
play/pause intent. The app has one Play/Pause control, no seeking UI or ocean
selected-area inspector. The demo audio remains a separate existing feature.

`useOceanPlayback` handles readiness, errors, retry, autoplay rejection and
transition locks. Default behavior is autoplay after readiness; reduced-motion
users start paused. Turning reduced motion on pauses the animation; explicit
Play remains available. Hidden browser tabs pause and wait for explicit Play.
Chapter exit/cover closure pauses the video and releases its source; reentry
starts a fresh chapter instance. View switches preserve position, not camera
orientation (existing viewer behavior). A failed load leaves reference browsing
available and offers retry. Only 2:1 media is accepted.

`observeVideoFrames` uses video-frame callbacks, with an animation-frame fallback,
to draw/invalidate without React updates on each frame. Paused renderers draw a
single current frame and stop scheduling work. All callbacks/listeners are cleaned
up on view changes and unmount. `OceanMapLayer` draws into a canvas inside the
map SVG transform; it shares geographic picking/navigation and the existing book
canvas snapshot mechanism. `OceanGlobeLayer` owns a disposable VideoTexture on a
slightly larger sphere, with no picking interception. It invalidates the existing
demand-rendered R3F canvas only as frames arrive. Source pixels keep their colors
through an unlit, non-tone-mapped material.

The source is a local, unmodified NASA download. See `public/media/ocean/README.md`
for provenance, file checksum, download setup and time/measurement limits.
The approved source is now the 2048 × 1024 MP4, not the earlier 640 × 320 M4V.
Its larger original frames improve zoom clarity without changing playback or
scene geometry. The map canvas takes its dimensions directly from the video;
the globe uses the same native video in its texture. No transcoding or tools are
needed. Run `./scripts/download-ocean-video.ps1` after cloning/before building;
the large local asset is Git-ignored and copied by Vite into the production output.

Shared playback extraction: `useOceanPlayback`, `OceanGlobeLayer` and the former
`videoFrames` export now delegate to `media/useVideoPlayback`,
`globe/layers/GlobeVideoLayer` and `media/videoFrames`, also used by CO₂. The
Play/Pause/retry UI uses `media/VideoPlaybackControls` with the same layout and
legend. Media identity, time retention on view switches and cleanup are unchanged.

`map/layers/OceanMapLayer` now delegates to the shared `MapVideoLayer`, also used
by CO₂. The canvas retains the video's native dimensions; frame subscriptions,
pan/zoom, snapshots and renderer cleanup keep the existing behavior. The shared
renderer never owns or changes media playback.

```sh
node --experimental-strip-types --test src/features/visualization/ocean/videoFrames.test.mjs
```
