# NASA annual night-light overlays

Credit: NASA's Scientific Visualization Studio; visualization by Kel Elkins.
Source: https://svs.gsfc.nasa.gov/5276/ — annual lights-only frame set, 2012–2023.

These images supply the actual city-scale visual detail that cannot be recovered
from the teammate's 180 × 90 aggregate JSON. They are a separate visual asset;
the JSON remains the coarse cell-lookup source, not a numerical description of
every high-resolution pixel. No city lights are procedurally invented.

Each source TIFF is 7680 × 4320. Its complete global extent is resized to the
map's 2:1 equirectangular presentation, at 2048 × 1024, without geographic crop
or longitude shift. The baked-in year label in the South Atlantic is blacked
out in source rectangle x=3300, y=2600, width=450, height=240. No light patterns
are added. JPEG quality 92 keeps all twelve local overlays together about 1.6 MB.
Exact source URLs and SHA-256 hashes are recorded in `provenance.json`.

Regenerate on Windows PowerShell 7 using built-in System.Drawing (no app dependency):

```powershell
./scripts/prepare-night-lights-images.ps1
```

Original TIFFs are cached in the system temporary directory, not committed.
These optimized images are display assets, not scientific sampling rasters.
Screen blending removes black backgrounds over the existing dimmed Blue Marble
surface. Fractional slider positions crossfade adjacent annual images; this is
a visual transition, not an observation at an intermediate date. The extracted
cell lookup uses the nearest actual year. There is no independent timer, autoplay
or sound timeline. Provenance is kept here rather than in the compact viewer UI.
