# Carbon dioxide chapter animation

`CarbonDioxideVisualization` owns one local muted, looping 4096 × 2048 video from
NASA SVS 5436. It renders through `GlobeViewer` and the shared `GlobeVideoLayer`.
Its compact Play/Pause and legend disclosure follow the existing viewer controls.
Rotation, zoom, coordinate picking, focus and transition locks remain unchanged.
There is no local concentration inspector, seeking control or audio mapping.

`media/useVideoPlayback` is shared with Ocean: load/error/retry, autoplay fallback,
reduced-motion initial pause, explicit Play override, pause when hidden, and
source release on chapter/cover exit. Media callbacks and GPU textures are
disposed with the active renderer. Only one live video/globe is mounted.

NASA's original color/opacity legend opens in a bounded popover. It spans
380–460 ppm; sparse/transparent regions still contain CO₂. Coordinates are not
sampled from colors. The native combined movie preserves NASA's composition but
does not reconstruct three-dimensional atmospheric depth. Per-frame calendar
dates are deferred because the source timestamp mapping has not been validated
against this particular export.

See `public/media/carbon-dioxide/README.md` for exact source URLs, attribution,
checksums, dimensions, and scientific limits. No new dependencies are required.
