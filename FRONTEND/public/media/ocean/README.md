# Ocean surface animation

Unmodified NASA video, served locally. No transcoding, new Python packages or
external media tools were used.

- Source page: https://svs.gsfc.nasa.gov/3912/
- Download: https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/ecco2_sst_flow.mp4
- Local file: `ecco2-surface-flow-2048.mp4`
- Bytes: 256266335 (about 244.4 MiB)
- SHA-256: `eede4b8230e37e2241ae8459a83c5ce21f824e1dacc3ea692d7dbcec35c42851`
- Browser-verified dimensions: 2048 × 1024; duration: 66.7 seconds.
- Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio.
  Animators: Greg Shirah, Horace Mitchell and Eric Sokolowsky.

NASA describes ECCO2 modeled surface currents colored by sea surface temperature,
covering 2007-03-25T12:00Z through 2008-03-03T12:00Z. These are historical model
visualizations, not live observations. NASA's documented colors are blue at 0°C,
green at 10–20°C, yellow near 25°C, and red at 32°C. The compact UI gradient is
an approximate explanatory legend, not a pixel-to-temperature decoder.

The 2:1 global video is mapped west-to-east and north-up onto the reference map
extent and the globe's existing sphere UVs. The source's land/background imagery
is retained as part of the full surface layer. Coastlines were visually checked
in both viewers, including zoomed views. The original 2048 × 1024 MP4 replaces
the smaller 640 × 320 M4V; the old file has been removed. The new source has
10.24 times as many pixels per frame. Both versions were compared at the same
playback time before replacement: duration, orientation and global extent match.
No geographic cropping, time interpolation or fabricated flow vectors are
introduced. Deep zoom still has a finite source-resolution limit.

The original sequence repeats at its endpoint. Its join is intentionally not
made seamless. The ocean JSON is not used to claim local temperatures or current
speed; geographic selection is disabled in both views. Pausing opens Current view with
approximate frame temperature estimates; no local measurement inspector is provided.

## Download and build setup

This file exceeds GitHub's 100 MiB regular-file limit and is narrowly ignored
by Git. The application still serves it locally, without runtime dependency on
NASA or an external hosting service. After cloning, and before a production
build/deployment, download it using the built-in PowerShell script:

```powershell
./scripts/download-ocean-video.ps1
```

The script checks SHA-256, skips an existing matching file, and does not overwrite
an unexpected existing asset. It installs nothing and performs no conversion.
Vite copies the local video into `dist/media/ocean/` when building, outside the
JavaScript bundle. Deployment must include that media file and support ordinary
MP4 delivery/range requests. Omitting the download leaves the viewer's load-error
and retry UI; there is no low-resolution fallback.

Rendering already preserves native source size: the map canvas is 2048 × 1024,
and the globe's VideoTexture uploads the video without an intermediate resized
canvas. Existing linear filtering, color handling and demand-rendering are kept.
