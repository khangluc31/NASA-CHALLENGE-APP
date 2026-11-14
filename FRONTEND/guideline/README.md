# NASA Earth Jukebox — Frontend Development Guideline

**Status:** MVP architecture and team working agreement, v1.0  
**Scope:** Browser-based interactive science book for NASA Space Apps; React + Vite + TypeScript.  
**Audience:** Both frontend developers, Data, Sound, Testing, Presentation, and coding agents (Codex).

> Read this file before changing code. The agreed book experience is the product backbone. Preserve it unless the team explicitly approves a design change. Examples and proposed interfaces below are implementation starting points, not claims about NASA data or finalized challenge eligibility.

## 1. Product and design backbone

Build an interactive scientific book that connects NASA Earth Information Center (EIC) visualizations, scientific data and dynamic sonification. The experience is a book, not a conventional dashboard.

- **Left page:** chapter title, appropriate interactive visualization, visualization controls, audio play/pause and an audio visualization (e.g. spectrum inspired by music visualizers). Playback speed is optional. Audio is user-controlled.
- **Right page:** scientific explanation, data values, units, location/time when meaningful, mapping explanation and source attribution. Long content can scroll or paginate. Within one chapter, keep the left visualization mounted and stable.
- **Bookmarks:** direct chapter navigation; compact number/icon, title on hover and keyboard focus, distinct active state. Jumping multiple chapters uses one transition, not a chain of page flips.
- **Chapter change:** a forward page-flip may cover the right page with the left page; reverse direction should be visually consistent. Lock model interaction during transitions; fade out audio; prepare the next chapter preview; activate the new visualization after the transition and data readiness. Show preview/loading if data is not ready. Do not mount/render two expensive live 3D scenes during a flip.
- **Synchronization:** a selected geographic point, frame or time sample updates the right-page inspector and sonification from the same source. Globe rotation alone must not imply a selected location unless the chapter explicitly defines a sampling rule (e.g. center-of-view sampling).
- **Accessibility:** keyboard-operable controls, visible focus, readable contrast, reduced-motion option, audio mute/volume, textual equivalents for audio and color-based encodings. Never rely on sound or color alone.
- Keep visual style coherent with the team's latest design PDF. Exact typography, colors and page geometry remain design decisions; do not invent a new visual identity in a feature PR.

## 2. Technology stack and dependency policy

| Technology | Use | Status |
| --- | --- | --- |
| React + Vite + TypeScript | UI, dev server, build, type safety | Required |
| ESLint | React/TS lint rules | Required; retain generated config |
| Three.js + React Three Fiber (R3F) + Drei | 3D scenes, controls, helpers | Install now |
| Tailwind CSS v4 + Vite plugin | Styling | Install now |
| Lucide React | Icons | Install now |
| Zustand | Shared cross-feature state | Install now |
| Motion | Book/UI transitions | Add when implementing transitions |
| Web Audio API / Tone.js | Audio engine | Agree with Sound owner before adding Tone.js |
| Zod | Runtime validation | Optional, when data format is agreed |
| Map library / postprocessing / shaders | Specialized visualization | Add only for a demonstrated need |

Use npm and commit `package-lock.json`. Use the same Node version across the team; check the installed Vite package's Node requirements and React/R3F peer dependencies. Do not force-install incompatible packages. Use stable releases, not prerelease versions. Do not add React Native, Next.js, Express or a backend without team approval.

### Bootstrap (run in the existing Vite project root)

```sh
node -v
npm -v
npm install
npm run dev
npm run build
npm run lint
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
npm install tailwindcss @tailwindcss/vite
npm install lucide-react zustand
```

For React 19, choose a compatible R3F 9 stable release; for other React versions verify peer requirements. Preserve the React plugin already in `vite.config.ts` (including SWC if selected). Example for the standard React plugin:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({ plugins: [react(), tailwindcss()] })
```

In `src/index.css`, add `@import "tailwindcss";` and keep necessary global styles. Tailwind v4 needs no `tailwindcss init -p` step. Verify `npm run dev`, `npm run build`, `npm run lint` and a tiny R3F Canvas + OrbitControls + styled button before committing the baseline. Teammates use `npm ci` after cloning.

Optional commands, only when approved and used:

```sh
npm install motion
npm install tone
npm install zod
```

## 3. Repository layout

Target structure (create folders/files only when needed; Git does not track empty folders):

```text
earth-jukebox/
  AGENTS.md                  # root agent instructions pointing to this guideline
  README.md                  # project overview, setup, demo link
  guideline/README.md        # this working agreement
  public/
    textures/                # static globe textures
    media/                   # approved EIC frames, previews, media
    data/                    # browser-ready datasets and manifests
  src/
    components/ui/           # shared UI primitives
    features/
      book/                  # shell, page layout, bookmarks, transitions
        components/
        hooks/
      visualization/         # shared viewer host and viewer contracts
        globe/               # R3F scenes, picking, layers, camera
        map/                 # 2D geographic visualization
        media/               # image/video/frame visualization
      audio/                 # player UI, engine adapter, analyzer
      chapter/               # chapter content and right-page inspector
    data/
      adapters/              # parse/validate/normalize external data
      chapters/              # chapter manifest and dataset config
    store/                   # shared selection, chapter, playback state
    types/                   # cross-feature contracts
    hooks/                   # genuinely reusable React hooks
    lib/                     # pure helpers (coordinates, mapping, formatting)
    styles/                  # design tokens and shared styling
    App.tsx                  # composition and integration
    main.tsx                 # entry point
    index.css                # global CSS / Tailwind import
  package.json
  package-lock.json
  vite.config.ts
  eslint.config.js
```

Feature-private hooks/components stay inside their feature. Do not duplicate a utility in two features. `components/ui` must not import feature-specific business logic. `data` must not import React UI or control audio. `App.tsx` composes features; it should not contain all implementation logic. Preserve Vite's generated TS/ESLint files.

### Ownership

- FE A: `features/book`, `features/chapter`, shared UI and book styling; navigation and transitions.
- FE B: `features/visualization`, visualization controls and audio UI integration; coordinate and frame interaction.
- Data: dataset provenance, preprocessing, chapter metadata and adapters, in coordination with FE B.
- Sound: mapping rules, engine lifecycle, audio synthesis and output interface; coordinates with FE B.
- Testing: acceptance checks, browser/performance testing, regression and demo rehearsal.
- Presentation: scientific narrative, source credits, demo flow and explanation of mapping.
- One agreed integration owner per sprint handles `App.tsx`, shared store, cross-feature types and dependency changes. Review shared contracts together before editing. Ownership above is a proposed assignment by module; confirm names with the team.

## 4. Architecture and data flow

```text
NASA/EIC sources -> preprocessing (if needed) -> browser-ready assets
  -> adapter/validation -> chapter registry + selected sample
  -> viewer + right-page inspector + sound engine
```

No backend for MVP: static assets and browser processing are sufficient when files are small and public. Large NetCDF/HDF, authenticated APIs or unsupported formats may need offline preprocessing by Data. Never expose secret keys in Vite environment variables; `VITE_*` values are public. Do not assume NASA APIs permit CORS. Bundle essential demo assets locally and use `import.meta.env.BASE_URL` for public asset paths when deploying to a subpath.

### Proposed shared TypeScript contracts

Finalize with Data/Sound before integrating real datasets. The following deliberately supports geo, time-series and frame-based chapters rather than requiring every visualization to have latitude/longitude.

```ts
export type ViewerKind = 'globe' | 'map' | 'media'
export type SampleLocation =
  | { kind: 'geo'; latitude: number; longitude: number }
  | { kind: 'frame'; frameIndex: number; x?: number; y?: number }
  | { kind: 'global' }

export interface DataSample {
  id: string
  datasetId: string
  location: SampleLocation
  timestamp?: string // ISO 8601 if available
  variable: string
  value: number | null // null = missing, never zero by default
  unit: string
  normalizedValue: number | null // 0..1, agreed reference domain
}

export interface ChapterConfig {
  id: string
  title: string
  viewer: ViewerKind
  datasetId: string
  sourceUrl: string
  previewUrl?: string
  dataUrl?: string
  mappingId: string
}

export interface AudioEngine {
  start(sample: DataSample): Promise<void> // user gesture first
  update(sample: DataSample): void
  stop(): void
  setVolume(value: number): void // 0..1
  dispose(): void
}
```

Contract invariants: latitude [-90,90], longitude [-180,180], normalized finite values [0,1], explicit coordinate orientation and time reference, missing data handled before sonification. Add vector/multi-variable fields only when needed. Data owner documents variable, units, domain, normalization, missing-data handling, sampling and provenance. Do not infer scientific values from colored visual frames unless the color mapping and projection are validated; otherwise label the mapping as a visual proxy. Distinguish historical data processed in real time from live Earth observations.

### State and lifecycle

Store shared `activeChapterId`, `pendingChapterId`, transition phase, selected sample ID, time/frame cursor, playback intent/status and user volume. Derive the active sample from dataset + selection; avoid duplicated mutable values. Keep camera, hover, per-frame animation and audio nodes local to their respective engines; never write 60 FPS animation values to Zustand. Use a single playback timeline for synchronized media/audio when applicable.

Transition sequence: idle -> leaving (lock navigation/model, fade/stop audio) -> flipping (preview; load next chapter) -> loading if needed -> ready (commit chapter and sample, unlock) or error (show retry/previous chapter). Use a transition ID or AbortController to prevent stale async results. Release resources from old chapters. Do not auto-resume audio in a new chapter; require explicit user action. Reduced-motion mode uses an immediate or short transition with the same state rules.

## 5. EIC chapter coverage and references

**Scope update (2026-11-14):** The merged implementation contains three chapters
in order: DYAMOND Global Carbon Dioxide; Global Sea Surface Currents and
Temperature; Change in Night Lights between 2012 and 2023. It opens on CO₂.
The team also authorized temporary demo audio and long sample chapter text.
Preserve the viewer capabilities supplied by the visualization integration:

| Chapter / reference | Approved views | Reference background |
| --- | --- | --- |
| [DYAMOND Global Carbon Dioxide, SVS 5196](https://svs.gsfc.nasa.gov/5196/) | Globe | Blue Marble January 2004 with topography/bathymetry |
| [Sea Surface Currents and Temperature, SVS 3912](https://svs.gsfc.nasa.gov/3912/#media_group_349716) | Globe (default) / Map | Blue Marble January 2004 with topography/bathymetry |
| [Night Lights 2012–2023, SVS 5313](https://svs.gsfc.nasa.gov/5313/) | Map | Blue Marble January 2004 with topography/bathymetry |

Globe/Map switching preserves coordinates and remembers the chapter's view until refresh; only one view mounts. Coordinates appear as unboxed lower-right text; lower-left −/+ tools replace the navigation board, with keyboard rotation/pan retained. Both viewers use red selection pins with contrasting white centers on borderless black viewports. The right page remains explanatory paper-style content for this phase; the earlier synchronized inspector guidance applies when scientific sample integration is agreed. An independent demo audio player is available; scientific sound mapping remains owned by the Sound teammate. Scientific layers and datasets are deferred; background imagery is historical geographic context, not measurements or evidence that source videos are directly reprojectable. Blue Marble is the approved default for all three chapters. Night Lights must receive lights from its future verified data layer; the previously sourced Black Marble asset is retained for provenance but is not used by the book. The original ten references are no longer the current delivery scope.

## 6. Implementation conventions

- TypeScript strict; avoid `any`, unsafe casts and non-null assertions. Use discriminated unions for viewer/sample variants, typed props, and runtime validation at external data boundaries.
- Components and types: PascalCase (`EarthGlobe.tsx`, `DataSample`). Hooks: `useSomething.ts`. Functions/state: camelCase. Shared constants: UPPER_SNAKE_CASE where useful. Folders: lowercase/kebab-case. Prefer descriptive English identifiers and comments explaining why, not what.
- Functional React components; obey Hooks rules. Use effects for external systems, cleanup subscriptions/timers/audio, and handle StrictMode mount/unmount correctly. No global audio context creation on module import.
- Use Tailwind for layout/UI; shared CSS tokens for book colors, spacing and typography. Use Motion for DOM/page transitions and R3F `useFrame` for 3D animation. Avoid two libraries animating the same property.
- R3F: keep Canvas scoped to active viewer, stable keys, reuse geometries/materials, use instancing for many markers, cap DPR when needed. Dispose manually-owned textures, geometry and subscriptions. Validate lat/lon-to-sphere orientation using known landmarks. Do not deform scientific geometry merely for spectacle without labeling it.
- Audio: start only from user gesture; use a master gain/volume with safe bounds, smooth parameter changes, stop/fade on chapter exit, dispose resources. Use actual mapped audio for analyzer visuals; mock visuals must be labeled. Missing data produces no misleading sound.
- Data integrity: keep raw values/units visible, use a fixed documented comparison domain, never invent NASA measurements. Mapping must be explainable (e.g. normalized intensity to pitch), documented by Sound, and use consistent source samples across views.
- UI: loading/error/empty states for all data-dependent screens; responsive layout (desktop book spread first, readable stacked/mobile fallback); no broken controls, no unrelated redesigns.
- Security/performance: no secrets or unlicensed assets; avoid huge raw datasets in Git; keep essential demo assets local, and use lightweight previews. Add dependencies only with a reason and review.

## 7. Git and Codex workflow

Branch examples: `feat/book-navigation`, `feat/globe-viewer`, `feat/audio-integration`, `fix/chapter-transition`. Protect `main` from unfinished work; use small PRs. Commit convention: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. Do not commit `node_modules`, `dist`, secrets or IDE-local settings. Commit lockfile updates with package changes.

Before a task: read `AGENTS.md`, this guideline and relevant existing code; identify owner/files and acceptance criteria. Pull latest main and create/refresh feature branch. Ask the agent to work on one feature, not the whole app. Review plan/diff, then run lint/build and manually test. Never accept an agent's claim of passing tests unless commands actually ran. Report failed checks and assumptions. Coordinate schema/store edits with the integration owner. No destructive Git operations, overwriting teammates' changes or unrelated refactors.

### Prompt template

```text
Read AGENTS.md and guideline/README.md before starting.
Task: [one feature or bug]
Owner / allowed files: [feature folder and explicitly permitted shared files]
Acceptance: [observable behavior and edge cases]
Constraints: preserve book design, existing contracts and dependencies.
Do not change unrelated files or invent NASA data.
Inspect existing code first; reuse components and types.
Implement the smallest working change, run npm run lint and npm run build,
and report changed files, verification results, assumptions and remaining issues.
If a shared contract or architecture change is required, explain it before editing.
```

### Root AGENTS.md (create separately)

```markdown
# Earth Jukebox agent instructions

Before editing, read `guideline/README.md` and follow its architecture,
feature ownership, design backbone and validation rules. Scope changes to the
current task. Coordinate shared state/contracts and new dependencies before
changing them. Do not invent NASA data or redesign the book experience.
Run `npm run lint` and `npm run build` after changes; report actual results.
```

## 8. MVP delivery and acceptance

1. Baseline: Vite React TS + ESLint, dependencies, Canvas smoke test, Git baseline.
2. Book prototype: two-page layout, bookmarks, one safe transition, placeholder viewer and inspector.
3. Vertical slice: one chapter with mock sample, selection -> inspector -> audio; explicit mock label. Replace with verified NASA/EIC data as soon as available.
4. Real-data integration: adapter, manifest, source attribution, documented mapping, location/time or frame selection, working play/pause/volume.
5. Expand chapters via registry and appropriate viewers; retain preview/unavailable states for incomplete chapters. Add polishing only after core works.
6. Test and rehearse: fresh `npm ci`, lint/build, production preview, offline demo assets and backup recording if permitted.

Definition of done for each feature: build/lint pass; no new console errors; agreed behavior verified; loading/missing/error handled; no broken neighbor features; source/units and mapping traceable where relevant; no unapproved changes. Test keyboard controls, rapid bookmark clicks, pending fetch errors, audio stop and explicit restart, globe picking, same-chapter pagination, multiple chapter switches (no leaking audio/WebGL resources), and the actual presentation laptop/browser. `npm run preview` checks the production bundle locally; it is not a production hosting server.

## 9. Decisions and open questions

**Agreed direction:** browser-only React + Vite + TS, ESLint, two FE modules, science-book concept, multiple viewer types, shared data/audio synchronization, user-controlled audio.

**Proposed, confirm with team:** exact folder boundaries and FE ownership, Zustand, Tailwind v4, Motion for page flips, shared contract above, viewer choices per chapter, initial one-chapter vertical slice, naming conventions and release process.

**Still unresolved:** official EIC resource coverage/eligibility (especially Caldwell 73), actual dataset formats and units, scientific mapping rules, exact visual tokens and page-flip implementation, audio engine choice, device performance limits. Do not treat a proposed interface or sample as finalized scientific data. Record approved changes here or in a linked decision log, and communicate to both FE developers before implementation.
