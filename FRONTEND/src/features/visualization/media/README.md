# Media viewer

FE B's home for approved images, video and frame-based visualization. No media
player, timeline or scientific sampling implementation is included yet.

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
