# Book sonification integration

`useBookVisualization.renderAudio` mounts `ChapterSonification` only while the
active book slot is interactive. It reuses the compact DemoSonification player
layout through `SonificationPlayer`; no audio-lab UI or styles are imported.
The supplied `audio/AudioEngine` synthesizes in the browser with Tone.js, now an
explicit dependency. Audio-lab remains a separate, unchanged test bench.

Sources use BASE_URL and the existing validated datasets:

- CO₂: `data/carbon-dioxide/co2.json`; mean from the same paused frame and duration
  lookup as the inspector, fixed mapping 380–460 ppm to 16 pitch rows.
- Ocean: `data/ocean/ocean.json`; same paused frame as the inspector, fixed 0–32°C
  domain. Both frame chapters play eight repeated pulses (about 1.33 seconds),
  expressing one estimate rather than inventing a within-frame melody. Pitch is
  pentatonic-quantized; hue also changes timbre. Similar values may sound alike.
- Night Lights: `data/night-lights/map.json`; nearest actual year. This checkout
  has the validated 180 × 90 regional grid, not the teammate's 96 × 16 audio grid.
  The adapter transposes actual cells for west-to-east scanning without resampling
  or new values. Coverage below 0.5 is silent, matching the supplied engine policy.
  Up to three bright rows per column become notes; latitude row sets pitch.
  One complete year lasts about 30 seconds at the engine's default 90 BPM.

Changing frame/year, resuming video, leaving a chapter or closing the book disposes
the previous player. A new source always requires Play. Camera/pin changes do not
change the sound. Mute and volume survive frame/year changes within a chapter.
The player claims the existing foreground-audio priority while starting/playing,
so background music is suppressed. Source loading is abortable and offers Retry.

The engine changes are limited to post-volume FFT/waveform analysers, lazy volume,
cancellation of pending starts, and silencing synth/reverb output on pause/stop.
The adapter cleans listeners, timers, scheduled transport work and audio nodes.
Tone's shared context remains reusable. The audio-lab singleton and book player
must not play concurrently because the supplied engine uses global Tone.Transport.
Audio-lab is not mounted in the book.

Frame values are approximate visual estimates; Night Lights is a brightness proxy.
Sound does not add measurement precision or imply geographic values for CO₂/Ocean.
Technical provenance remains in the datasets' READMEs, outside the compact player.

Checks: lint, build, `chapter-sound.test.mjs`, `engine-lifecycle.test.mjs`, and
existing data/viewer/book regressions. Lifecycle tests use a controlled audio clock;
real browser listening, spectrum appearance, and autoplay/error behavior still
require manual acceptance on the presentation browser.
