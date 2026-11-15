import type { BookChapter } from './types'

// Decorative cover/background imagery, not chapter measurements.
export const EARTH_PREVIEW = 'https://svs.gsfc.nasa.gov/vis/a000000/a004000/a004019/earthWideNight.0001.jpg'
export const EARTH_DAY = 'https://svs.gsfc.nasa.gov/vis/a000000/a004000/a004019/earthWideDay.0001.jpg'
export const PREVIEW_CREDIT = 'https://svs.gsfc.nasa.gov/4019/'

// Approved presentation scope; scientific adapters and layers remain Data-owned.
export const BOOK_CHAPTERS: readonly BookChapter[] = [
  { id: 'carbon-dioxide', shortTitle: 'A connected atmosphere', title: 'DYAMOND Global Carbon Dioxide', category: 'CARBON CYCLE', viewer: 'globe', supportedViews: ['globe', 'map'], sourceUrl: 'https://svs.gsfc.nasa.gov/5436/', introduction: 'Explore NASA’s Science On a Sphere rendering of modeled atmospheric carbon dioxide during January–March 2020. Explore the animation in Globe or Map view, or pause to inspect its patterns and approximate frame estimates. The spherical video shows the rendered atmosphere; it does not provide independent altitude views or location-specific concentration measurements.' },
  { id: 'ocean-temperature', shortTitle: 'An ocean in motion', title: 'Global Sea Surface Currents and Temperature', category: 'OCEAN SYSTEMS', viewer: 'globe', supportedViews: ['globe', 'map'], sourceUrl: 'https://svs.gsfc.nasa.gov/3912/', introduction: 'NASA’s ECCO2 visualization shows modeled surface currents colored by sea surface temperature. Explore the repeating historical animation in globe or map view, and use Play or Pause to control its motion. Pause to inspect approximate temperature estimates in Current view. Local temperature and current measurements are not available.' },
  { id: 'night-lights', shortTitle: 'Change in Night Lights', title: 'Change in Night Lights between 2012 and 2023', category: 'EARTH AT NIGHT', viewer: 'map', supportedViews: ['map', 'globe'], sourceUrl: 'https://svs.gsfc.nasa.gov/5313/', previewUrl: `${import.meta.env.BASE_URL}textures/blue-marble-topo-bathy-2004-01-2048.jpg`, introduction: 'NASA’s selected visualization explores annual night lights and their changes between 2012 and 2023. Explore annual light patterns in Map or Globe view, and select a location to inspect regional brightness history.' },
  { id: 'audio-lab', shortTitle: 'Audio Lab', title: 'Earth Jukebox Audio Test Bench', category: 'AUDIO LAB', viewer: 'media', introduction: 'Audio test bench: load a dataset, scan the image to play it, and hear individual cells and colors. The left page holds the data source, playback controls and grid; the right page holds the color swatches, image probe and log.' },
]
