# Carbon dioxide chapter animation

`CarbonDioxideVisualization` owns one local muted, looping 4096 × 2048 video from
NASA SVS 5436. Globe is the default; Switch view toggles Globe ↔ Map and remembers
the chapter's choice until refresh. The chapter stays mounted above the renderer
branch, retaining the same video, playback position, Play/Pause intent and Current
view subscription. Only the active renderer mounts: `GlobeViewer` with the shared
`GlobeVideoLayer`, or `MapViewer` with the shared `map/layers/MapVideoLayer`.
Map displays the full 4096 × 2048 source frame without cropping or downsampling,
inside the existing equirectangular pan/zoom transform. Switching views resets
local camera or map navigation, matching Ocean's existing behavior.
Its compact Play/Pause and always-visible legend follow the existing viewer controls.
Rotation, zoom, keyboard focus and transition locks remain available. Coordinate
selection, pins, selection crosshairs and coordinate readouts are disabled in both
CO₂ views. Ocean and Night Lights retain their existing selection behavior.

Pausing opens Current view with approximate mean and percentile estimates from
the supplied frame extraction. These summaries are independent of view mode,
globe rotation and map pan/zoom. Map view does not turn source-pixel estimates
into full-map or area-weighted global statistics. There is no seeking control or audio
mapping.

`media/useVideoPlayback` is shared with Ocean: load/error/retry, autoplay fallback,
reduced-motion initial pause, explicit Play override, pause when hidden, and
source release on chapter/cover exit. Media callbacks and GPU textures are
disposed with the active renderer. Only one live video/globe is mounted.

NASA's original color/opacity strip is always visible below the combined
zoom/playback row, with readable 380, 400, 420, 440 and 460 ppm ticks.
It spans
380–460 ppm; sparse/transparent regions still contain CO₂. Coordinates are not
sampled from colors. The native combined movie preserves NASA's composition but
does not reconstruct three-dimensional atmospheric depth. Per-frame calendar
dates are deferred because the source timestamp mapping has not been validated
against this particular export.

See `public/media/carbon-dioxide/README.md` for exact source URLs, attribution,
checksums, dimensions, and scientific limits. No new dependencies are required.
