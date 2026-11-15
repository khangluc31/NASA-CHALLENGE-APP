# Ocean animation estimates

`ocean.json` is the unchanged project-owner-supplied extraction of NASA SVS 3912:
https://svs.gsfc.nasa.gov/3912/ (NASA/Goddard Scientific Visualization Studio,
ECCO2 modeled surface currents colored by sea surface temperature).
SHA-256: `cfefda012f844527d47dd9e54a272020c12f6989a969a3effea1cec9255d348d`.

Source metadata: 1080 × 540, 30 fps, 2001 processed frames, sample step 1.
Local `ecco2-surface-flow-2048.mp4` MP4 track timing was inspected: 2001 samples,
timescale 600, 20 units per sample, duration 66.7 seconds (30 fps). This verifies
timing compatibility, not independent image-by-image equivalence of both exports.

The display uses `mean_temp`, `p10_temp`, and `p90_temp` in Celsius, preserving
the supplied numbers before one-decimal presentation. They are color-LUT estimates
from CIELAB matching of selected animation pixels, not area-weighted global sea
surface temperatures, local readings or direct physical measurements. Frame
color-match coverage ranges from about 3.9% to 5.8% of the full source image.
No current speed/direction is available: motion analysis was disabled.

Playback is the only clock. The shared pause observer uses a presented-frame media
timestamp where supported and otherwise the video playback position. The adapter
rejects mismatched durations and out-of-range times; missing values and zero-match
coverage remain unavailable. Globe/Map switches preserve the same source video
and frame summary. Geographic selection is independent of these estimates.

No calendar dates are inferred, and the interface does not expose frame numbers,
playback timestamps, extraction settings or raw coverage metadata. The source's
period is historical (March 2007–March 2008). See `public/media/ocean/README.md`
for the local animation's exact download, credit and checksum.
