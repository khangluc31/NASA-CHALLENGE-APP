# Night Lights map asset

`map.json` is a lossless map-only derivative of the teammate-supplied
`night_lights.json`, extracted from the [NASA SVS 5313 visualization](https://svs.gsfc.nasa.gov/5313/).
Credit: NASA's Scientific Visualization Studio. This is a video-derived visual
proxy, not original VIIRS radiance data or a validated measurement product.
Geographic orientation and full-world extent were confirmed by the project owner.

The 12 frames cover 2012–2023 with 180 × 90 cells. Arrays are row-major, starting
at the northwest corner. Source cell `value` and `cover` become `values` and
`coverage`, without rounding. Video extraction frame IDs are preserved. Audio
grids and global summary statistics are not needed for this map asset and are
omitted. The asset is approximately 1.96 MB instead of the original 19.3 MB.

`provenance.json` retains the original SHA-256, source-video metadata,
calibration and mask information. The global-percentile normalization uses
background 0 and reference 37 after clipped background subtraction from frame
960. Values are dimensionless brightness in [0,1], not radiance. Coverage is
handled as the extracted valid-pixel fraction: zero means unavailable; partial
coverage retains the value and is explicitly reported. No aggregation method
beyond the supplied extraction is asserted. Video compression, residual
background, masks and extraction choices may affect the displayed brightness.

Regenerate with Node 24, using the original teammate file:

```sh
node --experimental-strip-types scripts/prepare-night-lights.mjs <path-to-night_lights.json>
```

The script validates all cells, transposes their order, and overwrites only the
two generated assets in this directory. It does not modify the original file.
Do not silently replace this extraction with different calibration or geography.

The separately referenced purple/orange change image has `decoded: false` in
the original extraction and is not included or reconstructed here.
