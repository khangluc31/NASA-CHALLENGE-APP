# Ocean animation lifecycle

`OceanVisualization` mounts only for the ocean chapter, above the Globe/Map
branch. It owns one hidden, muted, inline, looping HTML video element. Switching
view replaces only the renderer and retains the same video, position and user
play/pause intent. The app has one Play/Pause control, no seeking UI or ocean
selected-area inspector. Pausing opens Current view with approximate mean and
10th–90th percentile temperature estimates. Both viewers omit geographic
selection: no pins, coordinate readouts, selection crosshairs or selection hints.
Rotation, pan, zoom and keyboard navigation remain available. The demo audio
remains a separate existing feature.

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
map SVG transform; it shares map navigation and the existing book
canvas snapshot mechanism. `OceanGlobeLayer` owns a disposable VideoTexture on a
slightly larger sphere, with no picking interception. It invalidates the existing
demand-rendered R3F canvas only as frames arrive. Source pixels keep their colors
through an unlit, non-tone-mapped material.

The source is a local, unmodified NASA download. See `public/media/ocean/README.md`
for provenance, file checksum, download setup and time/measurement limits.
The source is NASA's 640 × 320 M4V, tracked in Git at 12,670,193 bytes so normal
clones and deployment builds include it. This replaces the 2048 × 1024 MP4 to
stay below 100 MB, with less zoom detail. The map canvas takes its dimensions
directly from the video; the globe uses the same native video in its texture.
No transcoding or tools are needed. The optional
`./scripts/download-ocean-video.ps1` helper restores/verifies the same file.
Track timing is unchanged: 2001 frames at 30 fps, lasting 66.7 seconds.

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

## Paused temperature summary

Ocean and CO₂ share `media/useCurrentView` for presented-frame observation and
state above disposable slots. CO₂ keeps compatibility exports. OceanInspector
uses the same `chapter/current-view.css` layout as CO₂, with concise explanatory
text; technical extraction details remain in `public/data/ocean/README.md`.
Frame summaries are independent of globe rotation and map navigation. Resuming shows a
pause prompt; view switches retain the same video, paused reading and notes tab.
