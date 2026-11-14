# Earth Jukebox

A React + Vite + TypeScript interactive science atlas. The existing dark book design, cover choreography, bookmarks, page turns, and reduced-motion/mobile behavior remain the presentation backbone.

## Current scope

| Order | Chapter / official resource | Views | Reference background |
| --- | --- | --- | --- |
| 01 | [Night Lights 2012–2023](https://svs.gsfc.nasa.gov/5313/) | Map | Blue Marble January 2004 with topography/bathymetry |
| 02 | [Sea Surface Currents and Temperature](https://svs.gsfc.nasa.gov/3912/) | Globe (default), Map | Blue Marble January 2004 with topography/bathymetry |
| 03 | [DYAMOND Global Carbon Dioxide](https://svs.gsfc.nasa.gov/5196/) | Globe | Blue Marble January 2004 with topography/bathymetry |

The book opens on Night Lights. These are interactive geographic foundations, not completed scientific visualizations. Chapter layers, measurement datasets, and sonification are not connected. Audio controls remain disabled for the Sound teammate's integration. Reference imagery must never be sampled as scientific measurements.

Ocean's clickable current-mode label preserves selection. View choice and coordinates are remembered per chapter until refresh, including page turns and closing/reopening. Camera/pan/zoom remain local and reset on viewer unmount. Coordinates appear as plain text at the visualization’s lower right. The right page remains explanatory chapter content. Borderless −/+ zoom tools sit at the lower left beside a drag/select hint. A discreet Select coordinates action opens keyboard coordinate entry; background image attribution remains in the texture documentation; the right page retains the chapter source link. Red teardrop pins with white centers mark both viewers; each pin tip anchors the selected coordinate. The scenes sit in black, borderless viewports; narrow layouts wrap the footer to prevent overlap.

## Development

Use the team's Node version compatible with the installed Vite package (Node 24 supports the focused test commands below).

```sh
npm ci
npm run dev
npm run lint
npm run build
npm run preview
node --experimental-strip-types --test tests/page-turn.test.mjs src/features/visualization/globe/utils/coordinates.test.mjs src/features/visualization/map/utils/coordinates.test.mjs
```

## Integration and ownership

Read [the project guideline](guideline/README.md) before edits. FE A owns the book and narrative; FE B owns viewers and geographic interaction; Data owns scientific adapters/layers/provenance; Sound owns synthesis and mapping. App composes `useBookVisualization` through `BookExperience.bookProps.renderVisualization`. No new global store, dataset schema, audio engine, or dependencies were introduced.

See [book lifecycle](src/features/book/README.md), [visualization integration](src/features/visualization/README.md), and [local texture provenance](public/textures/README.md). Surface assets work offline and use Vite's base URL. The decorative landing/cover images and Google Fonts still need network access.

Browser acceptance: desktop/mobile layout and zoom, note scrolling without viewer remount, view toggle and coordinate persistence, keyboard/touch selection, chapter flips and snapshots, close/reopen, image error/retry, WebGL failure, and repeated switching without leaked contexts. Automated geometry and transition checks do not replace these browser checks.
