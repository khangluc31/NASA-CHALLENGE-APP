# CO₂ animation-frame estimates

`co2.json` is an unchanged copy of the project owner's supplied extraction.
SHA-256: `302b106b47690fb16a45ef5e33999177dedbb17af192e822f1a1db9677b042b0`.

The source identifies `co2.mp4`, 3840 × 2160, 30 fps, 1176 frames and 39.2 seconds,
with NASA's `dyamondCbar_6-27-2024a.png`. Resource context:
https://svs.gsfc.nasa.gov/5196/ and https://svs.gsfc.nasa.gov/5436/.
The project owner confirmed that the local spherical video is the same sequence
at a different resolution. The adapter requires matching duration to within one
source frame; this checks timing compatibility, not independent image equivalence.

Values are approximate LAB nearest-colorbar matches over accepted visible pixels.
`co2_min_ppm` and `co2_max_ppm` represent the 1st and 99th percentiles, not absolute
extrema. The mean is a mean of accepted source pixels, not a global atmospheric
mean. Color and opacity blending with the Earth surface affect these estimates.
There are no coordinates, grid cells or independently sampled local measurements.
Insufficient-matching frames remain unavailable, never zero.

The inspector uses the paused video's presented media timestamp where supported,
otherwise its current playback time. Dates and the JSON's assumed simulation
timestamps are not displayed. Playback time and frame IDs remain internal.
The entire source-frame summary is independent of globe rotation and pin location.
