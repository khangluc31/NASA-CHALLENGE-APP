import type { BookChapter } from './types'

// Decorative cover/background imagery, not chapter measurements.
export const EARTH_PREVIEW = 'https://svs.gsfc.nasa.gov/vis/a000000/a004000/a004019/earthWideNight.0001.jpg'
export const EARTH_DAY = 'https://svs.gsfc.nasa.gov/vis/a000000/a004000/a004019/earthWideDay.0001.jpg'
export const PREVIEW_CREDIT = 'https://svs.gsfc.nasa.gov/4019/'

// Approved presentation scope; scientific adapters and layers remain Data-owned.
export const BOOK_CHAPTERS: readonly BookChapter[] = [
  { id: 'night-lights', shortTitle: 'Change in Night Lights', title: 'Change in Night Lights between 2012 and 2023', category: 'EARTH AT NIGHT', viewer: 'map', supportedViews: ['map'], sourceUrl: 'https://svs.gsfc.nasa.gov/5313/', previewUrl: `${import.meta.env.BASE_URL}textures/black-marble-2016-3600.jpg`, introduction: 'NASA’s selected visualization explores annual night lights and their changes between 2012 and 2023. The interactive map currently provides a historical Black Marble background; the comparison layer and scientific measurements are not connected yet.' },
  { id: 'ocean-temperature', shortTitle: 'An ocean in motion', title: 'Global Sea Surface Currents and Temperature', category: 'OCEAN SYSTEMS', viewer: 'globe', supportedViews: ['globe', 'map'], sourceUrl: 'https://svs.gsfc.nasa.gov/3912/', introduction: 'NASA’s selected visualization shows modeled surface currents colored by sea surface temperature. Explore the reference Earth in globe or map view. Current flows, temperature layers, and scientific measurements will be added after dataset integration.' },
  { id: 'carbon-dioxide', shortTitle: 'A connected atmosphere', title: 'DYAMOND Global Carbon Dioxide', category: 'CARBON CYCLE', viewer: 'globe', supportedViews: ['globe'], sourceUrl: 'https://svs.gsfc.nasa.gov/5196/', introduction: 'NASA’s selected visualization follows modeled carbon dioxide through Earth’s atmosphere. The globe currently provides geographic context; atmospheric layers, concentrations, and sound mapping remain to be connected.' },
]
