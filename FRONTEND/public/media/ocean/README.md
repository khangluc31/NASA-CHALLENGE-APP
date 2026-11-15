# Ocean surface animation

Unmodified NASA video, served locally and tracked in Git. No transcoding,
cropping, resizing, new packages or external media tools were used.

- Source page: https://svs.gsfc.nasa.gov/3912/#media_group_349716
- Download: https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/ecco2_sst_flow.m4v
- Local file: `ecco2_sst_flow.m4v`
- Bytes: 12,670,193 (12.67 MB / 12.08 MiB), below 100 MB.
- SHA-256: `72168fc1ef93e5ed622d29af79e027baf7c5372d175d8774d3f33c98a8eaea5f`
- MP4 container metadata: 640 × 320; 2001 samples, timescale 600,
  20 units per sample (30 fps); duration 66.7 seconds.
- Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio.
  Animators: Greg Shirah, Horace Mitchell and Eric Sokolowsky.

NASA describes ECCO2 modeled surface currents colored by sea surface temperature,
covering 2007-03-25T12:00Z through 2008-03-03T12:00Z. These are historical model
visualizations, not live observations. NASA's documented colors are blue at 0°C,
green at 10–20°C, yellow near 25°C, and red at 32°C. The compact UI gradient is
an approximate explanatory legend, not a pixel-to-temperature decoder.

The 2:1 global video is mapped west-to-east and north-up onto the reference map
extent and the globe's existing sphere UVs. The source's land/background imagery
is retained as part of the full surface layer. This replaces the 244.4 MiB
2048 × 1024 MP4 with NASA's smaller original export. Zoom detail is reduced;
the renderers retain native source dimensions without intermediate resizing.
Track duration and frame timing match the previous source and the Ocean data
adapter. Timing compatibility does not establish image-by-image equivalence
with the separate export used to extract the JSON estimates.

The original sequence repeats at its endpoint; its join is not made seamless.
The ocean JSON is not used to claim local temperatures or current speed;
geographic selection is disabled in both views. Pausing opens Current view with
approximate frame temperature estimates, not local measurements.

## Download and build setup

Normal Git clones include this asset. Vite copies it into `dist/media/ocean/`
when building, outside the JavaScript bundle. Deployment should serve `.m4v`
as `video/mp4` and support media range requests.

To restore or verify the file, optionally run:

```powershell
./scripts/download-ocean-video.ps1
```

The script checks SHA-256, skips an existing matching file and refuses to
overwrite an unexpected asset. It installs nothing and performs no conversion.
The old large MP4 is unused and remains ignored to avoid accidental commits.
