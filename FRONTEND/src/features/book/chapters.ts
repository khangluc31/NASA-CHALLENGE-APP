import type { BookChapter } from './types'

// Decorative NASA 2012 composite, NOT the 2012–2023 chapter dataset.
// Prefer a bundled asset at deployment; this remote preview has an offline fallback.
export const EARTH_PREVIEW = 'https://svs.gsfc.nasa.gov/vis/a000000/a004000/a004019/earthWideNight.0001.jpg'
export const EARTH_DAY = 'https://svs.gsfc.nasa.gov/vis/a000000/a004000/a004019/earthWideDay.0001.jpg'
export const PREVIEW_CREDIT = 'https://svs.gsfc.nasa.gov/4019/'

// Draft content stays in the book feature until the Data owner supplies a registry.
export const BOOK_CHAPTERS: readonly BookChapter[] = [
  { id: 'carbon-dioxide', shortTitle: 'A connected atmosphere', title: 'DYAMOND Global Carbon Dioxide', category: 'CARBON CYCLE', viewer: 'globe', introduction: 'Read a global story through an atmospheric model. Model context, comparison scales, and the sonification explanation will be added once the source data is confirmed.' },
  { id: 'ocean-temperature', shortTitle: 'An ocean in motion', title: 'Global Sea Surface Currents and Temperature', category: 'OCEAN SYSTEMS', viewer: 'globe', introduction: 'Follow the movement of the ocean. This chapter will bring together the selected visualization, its temperature scale, and an explanation of how currents are translated into sound.' },
  { id: 'night-lights', shortTitle: 'Change in Night Lights', title: 'Change in Night Lights between 2012 and 2023', category: 'EARTH AT NIGHT', viewer: 'globe', introduction: 'Explore how nighttime illumination can tell a story about our changing planet. This chapter will pair the team’s selected visualization with location-specific observations and sound.', previewUrl: EARTH_PREVIEW },
]
