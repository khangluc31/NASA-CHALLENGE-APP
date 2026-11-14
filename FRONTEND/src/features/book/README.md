# Earth Jukebox — book integration

The book implements the supplied dark scientific-atlas design. The cover opens on chapter 01 (DYAMOND Global Carbon Dioxide).
The three selected resources are CO₂, ocean currents/temperature, and night lights.
All three chapters are draft content. A demo audio player is implemented; scientific data mapping and the interactive
Earth viewer are still awaiting integration.

## Files and ownership

- `components/EarthBook.tsx`: spread, navigation, bookmarks, loading/error UI.
- `components/BookCover.tsx`: home screen and animated cover.
- `components/BookPlaceholders.tsx`: replaceable static viewer/audio placeholders.
- `hooks/useBookNavigation.ts`: cancellable chapter lifecycle.
- `types.ts`: book-owned presentation/slot contracts, not a shared data schema.
- `chapters.ts`: temporary presentation registry; replace from Data's registry.
- `../chapter/ChapterNotes.tsx`: scrollable right page with three sample sections.
- `../../styles/book.css`: geometry, paper, binding, responsive styles.
- `../../App.tsx`: composition point for FE A and FE B.

The visualization folder, shared store and scientific types have not been modified.
The user-authorized demo audio player lives in `features/audio`. Agree their contracts with FE B/Data/Sound.
Motion drives cover opening and forward/backward page turns. No flipbook SDK
or iframe is required; React content remains interactive on the actual pages.
The page turn uses a two-sided 3D sheet, not a deformable paper-curl simulation.

## Connect FE B's components

`EarthBook` accepts these optional render slots. Each receives `BookSlotProps`:

```ts
interface BookSlotProps {
  chapter: BookChapter
  isActive: boolean
  interactionDisabled: boolean
}
```

Example composition (the component and adapter names below belong to FE B;
replace them with the agreed exports):

```tsx
<EarthBook
  chapters={bookChapters}
  initialChapterId="night-lights"
  onClose={() => setIsOpen(false)}
  prepareChapter={(chapter, signal) => datasets.prepare(chapter.id, signal)}
  onBeforeChapterChange={(_chapter, signal) => audio.fadeOutAndStop(signal)}
  onChapterChange={(chapter) => selection.resetForChapter(chapter.id)}
  renderVisualization={(props) => <VisualizationHost {...props} />}
  renderAudio={(props) => <AudioPlayer {...props} />}
  renderInspector={(props) => <ChapterInspector {...props} />}
/>
```

- Keep chapter IDs and ordering stable while the book is mounted. To replace the
  registry, remount `EarthBook` with a new `key`.
- `prepareChapter` also runs for the initial chapter. Cache prepared datasets
  outside the viewer; resolve only when usable, reject on failure, honor abort.
- Render slots are functions returning JSX, not components to call Hooks inside.
  Define viewer component types outside the render function.
- The book owns navigation only. FE B owns camera, picking, time cursor, controls,
  selected sample and sound. Inspector and audio must consume the same sample.
- `isActive=false` / `interactionDisabled=true` means stop interaction and audio.
  The host is also made `inert` during transitions, but render loops/keyboard
  listeners/audio must respect these props themselves.
- Scrolling or changing the default notes section preserves the left viewer.
- During a flip the old live viewer/audio are unmounted. The turning sheet only
  has static content. The new live scene mounts after animation AND preparation.
- Release WebGL/audio resources in component cleanup (also on closing the atlas).
  `onBeforeChapterChange` is for awaited fades; closing unmounts immediately.
- A failed load displays Retry and Return to previous chapter. A failed initial
  load offers Retry and Close atlas. Never auto-resume audio after navigation.
- `renderAudio` should include play/pause, stop, mute, volume, actual analyzer
  output, and textual equivalents. The default demo player provides these
  controls and an auto-scaled waveform from the actual post-volume output.
- Within `data-book-interactive`, arrows belong to the viewer. The book's arrow
  shortcuts work when focus is on the reader/notes, without hijacking inputs,
  buttons, links, or interactive viewer controls.

## Lifecycle

Ready → leaving (await audio fade) → flipping (prepare in parallel) → loading
if needed → ready. Failed preparation → error → retry or return. Rapid clicks
are locked synchronously; jumping from 01 to 03 creates only one page turn.
AbortController prevents stale completions on cancellation/close. Animation
completion is driven only by Motion, so a busy rendering thread cannot be cut
short by a competing timeout. Already prepared chapters never enter loading. User/OS reduced motion uses a short fade.
Mobile uses stacked pages and a short fade instead of rotating a narrow spread.

## Imagery and data honesty

The decorative preview is the 2012 Earth-at-night composite from NASA SVS 4019:
https://svs.gsfc.nasa.gov/4019/
Credit: NASA's Goddard Space Flight Center Scientific Visualization Studio /
Earth Observatory. It is NOT the 2012–2023 comparison dataset. Other chapters
show viewer-type skeletons; source URLs and real data await verification.
Only the three resources selected by the team remain in the registry.

Image download was unavailable in the task terminal. The preview currently
loads from NASA and shows a labeled globe-icon fallback if unavailable. Before
an offline demo, download the credited image into `public/media/`, set
`EARTH_PREVIEW` to `${import.meta.env.BASE_URL}media/<filename>`, and preserve
credits. The background uses the credited Earth-at-day composite from the same NASA SVS source; it is decorative, not chapter data.

## Run and acceptance

From `FRONTEND`: `npm ci`, `npm run dev`. Checks: `npm run lint` and
`npm run build`. Both checks passed during implementation. The task environment
blocked a local listening socket (`EPERM`); interactive browser/performance QA
must still be run on the presentation laptop.

Manual checks:

1. Open via cover and text CTA; close via toolbar and wordmark.
2. Flip 02→03, 03→02, 01→03; rapid-click bookmarks during the turn.
3. Navigate all three chapters; verify first/last navigation is disabled.
4. Switch note sections and scroll; connected viewer must stay mounted.
5. OS/user reduced motion, Tab/Enter, arrow navigation and bookmark focus titles.
6. Desktop at 1440×900, tablet, mobile at 390px, and browser zoom at 200%.
7. Preparation resolving early/late, rejecting, retrying, canceling, closing.
8. Connect an audio engine: fade on chapter change, dispose on close, no autoplay.
9. Disconnect network: preview fallback, no misleading measurements or audio.
10. Profile on the demo laptop: one live scene, no WebGL/audio resource leaks.

## Page-turn continuity

The front face and stationary page are inert DOM snapshots of the actual outgoing
pages (including the selected notes section and scroll offset). The new spread
is laid out underneath; the back face snapshots that exact destination page.
Forward turns carry old-right → new-left, backward turns old-left → new-right.
The old stationary page stays until the rotating sheet fully covers it. The
snapshot has the same geometry and styles as the final page, with no decorative
replacement headings or end-of-turn loading flash. Mobile fades the full old
spread. Snapshots do not mount another React/WebGL viewer. Canvas pixels are
copied best-effort; FE B should provide a preserved visual preview if its WebGL
drawing buffer is cleared. Live viewer activation still occurs after the turn.

Regression check: `node --experimental-strip-types --test tests/page-turn.test.mjs`.
This tests early/late preparation, load errors, and waiting for animation completion;
it does not measure browser frame rate.

## Cover choreography

`BookExperience` now composes the landing and reader in `App.tsx`. On desktop:
copy fades out → the closed cover flies to the center → its front rotates open
onto a snapshot of the real spread. Closing reverses those stages, then restores
the landing copy. Each step awaits Motion completion; there are no handoff timers.
The reader stays mounted so the chapter and notes survive closing; `presented`
disables interaction and unmounts viewer/audio slots until the cover has opened.
Feed integration slots/callbacks through `BookExperience.bookProps` (the same
EarthBook props, excluding `onClose` and `presented`, which the shell owns).
The header Home button and Close atlas use the same close path. Repeated inputs
are locked during the sequence. Resize/scroll settles to a valid endpoint rather
than continuing toward stale viewport measurements. Narrow/mobile layouts and
reduced-motion users get a short transition without the spatial cover animation.

Validation: lint/build and the existing four chapter-transition regression checks
pass. The new cover choreography still needs visual verification in the browser.

## Typography, background, and proportions

The cover has a fixed 3:4 aspect ratio; the desktop spread has a 3:2 outer
ratio, so each half matches the cover. Both the flying scene and its front
snapshot use uniform `scale`, never separate X/Y scaling. Tablets at 900px and
below use stacked pages and the reduced spatial transition.

Book text (cover, pages, bookmarks, snapshots) uses Poppins. Exterior headings
use Audiowide, with Space Grotesk for supporting copy, inspired by the supplied
space-poster reference rather than claiming an exact font identification. Fonts
load through Google Fonts with system fallbacks. The decorative lower-center
Earth uses `EARTH_DAY` from NASA SVS 4019, with restrained atmospheric shading.
These remote assets require network access; vendor fonts and the credited image
locally before an offline presentation. Terminal downloading remained unavailable.

## Three-chapter demo update

Order: DYAMOND Global Carbon Dioxide; Global Sea Surface Currents and Temperature;
Change in Night Lights between 2012 and 2023. The cover count follows the registry.
Each Overview contains deliberately long sample editorial text. Its scroll region
has a stable scrollbar gutter; title, section tabs, source and left viewer remain
fixed. On macOS, system scrollbar visibility preferences may still hide the thumb
until scrolling.

`DemoSonification` is the default audio slot. It plays a bundled original 10-second chime WAV with changing pitches and
amplitude envelopes, with no external audio request. The waveform samples
the actual post-volume audio signal. It stops animating on pause/stop/end and
respects reduced motion. This is test audio, never claimed to map NASA data.
Play/Pause, Stop, volume, mute, time/progress, loading/retry and end-of-track replay
are implemented. Chapter exit and closing dispose the context with a short fade.
The inactive preview uses the same player geometry so page turns do not jump.
Replace via `renderAudio` when the Sound team's real mapping is ready.

Checks: `node --experimental-strip-types --test tests/*.test.mjs`, lint, build.

### Horizontal reactive spectrum

The demo visualizer now displays 48 logarithmic frequency bands mirrored around
the horizontal center: bass near the center, treble near the edges. Spikes extend
above/below the line with a fast attack and slower, frame-rate-independent release.
Thin, round-ended bars follow the supplied shape reference and retain the original teal palette. Measured output RMS
scales their height; no random bars or timer-driven fake beats.
The renderer uses real post-volume FFT data and respects mute/pause/reduced motion.
The default chime clip replaces the former steady sine so changes are audible
and visible. Silence/mute/pause gives a dotted baseline. This visualization does
not alter the audio itself. Reduced motion deliberately disables animation.
