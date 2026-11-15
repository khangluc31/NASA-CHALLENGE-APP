# Media viewer

FE B's home for approved images, video and frame-based visualization. Shared
video lifecycle and control primitives support the Ocean and CO₂ chapter layers.
There is no frame/pixel scientific sampling implementation.

- Use approved assets and preserve source attribution. Place static previews
  and media in `public/media/` when available.
- Use the agreed single playback timeline for synchronized media and audio.
  Do not create a competing clock inside the viewer.
- Frame or pixel interaction must follow documented sampling rules. Colored
  imagery is not numerical scientific data without validated calibration and
  projection; any visual proxy must be labeled explicitly.
- Respect transition locks, clean up media resources, and provide loading,
  error and empty states plus accessible controls and textual equivalents.

See [feature integration boundaries](../README.md).

- `useVideoPlayback(video, source, locked, reduceMotion)` owns media readiness,
  loading errors/retry, autoplay fallback, loop playback intent, reduced-motion
  behavior and unmount cleanup. The chapter owns the video DOM element; shared
  code neither creates a second timeline nor controls the independent demo audio.
- `observeVideoFrames` draws/invalidate on decoded frames, with a RAF fallback.
  Pausing stops repeated work; view changes cancel callbacks/listeners.
- `VideoPlaybackControls` shares the existing compact Play/Pause/retry/status
  presentation, with chapter-provided legend content. It uses book tokens.
- `globe/layers/GlobeVideoLayer` shares the disposable video texture renderer.
  Ocean's former hook/layer/frame exports are thin compatibility adapters; the
  implementation is not duplicated. Existing video-frame tests cover the shared
  module through those exports.
