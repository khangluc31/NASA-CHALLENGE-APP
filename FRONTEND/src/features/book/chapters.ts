import type { BookChapter } from './types'

// Decorative NASA 2012 composite, NOT the 2012–2023 chapter dataset.
// Prefer a bundled asset at deployment; this remote preview has an offline fallback.
export const EARTH_PREVIEW = 'https://svs.gsfc.nasa.gov/vis/a000000/a004000/a004019/earthWideNight.0001.jpg'
export const EARTH_DAY = 'https://svs.gsfc.nasa.gov/vis/a000000/a004000/a004019/earthWideDay.0001.jpg'
export const PREVIEW_CREDIT = 'https://svs.gsfc.nasa.gov/4019/'

// Draft content stays in the book feature until the Data owner supplies a registry.
export const BOOK_CHAPTERS: readonly BookChapter[] = [
  { id: 'caldwell-73', shortTitle: 'A universe of sound', title: 'Data Sonification: Caldwell 73', category: 'SONIFICATION REFERENCE', viewer: 'media', introduction: 'Begin with a different way of seeing. This reference chapter introduces the idea of translating visual information into sound. Caldwell 73 is an astronomical reference; its eligibility as an Earth chapter still needs confirmation.' },
  { id: 'night-lights', shortTitle: 'Change in Night Lights', title: 'Change in Night Lights between 2012 and 2023', category: 'EARTH AT NIGHT', viewer: 'globe', introduction: 'Explore how nighttime illumination can tell a story about our changing planet. This chapter will pair the team’s selected visualization with location-specific observations and sound.', previewUrl: EARTH_PREVIEW },
  { id: 'ocean-temperature', shortTitle: 'An ocean in motion', title: 'Global Sea Surface Currents and Temperature', category: 'OCEAN SYSTEMS', viewer: 'globe', introduction: 'Follow the movement of the ocean. This chapter will bring together the selected visualization, its temperature scale, and an explanation of how currents are translated into sound.' },
  { id: 'aerosols', shortTitle: 'Invisible journeys', title: 'GEOS Aerosols', category: 'ATMOSPHERE', viewer: 'globe', introduction: 'Discover the stories carried through the atmosphere. The final chapter will introduce the aerosol types shown by the source visualization and explain their sound mappings.' },
  { id: 'air-quality', shortTitle: 'The air we share', title: 'Air Quality Model Runs', category: 'ATMOSPHERE', viewer: 'map', introduction: 'Explore a model’s view of air quality. The team will add the modeled variable, time reference, units, and limitations alongside the interactive visualization.' },
  { id: 'perpetual-ocean', shortTitle: 'Perpetual Ocean', title: 'Perpetual Ocean 2: Western Boundary Currents', category: 'OCEAN SYSTEMS', viewer: 'media', introduction: 'Trace the ocean’s winding paths. Here, the final narrative will connect the selected ocean visualization with its underlying data and the rules that shape its soundscape.' },
  { id: 'carbon-dioxide', shortTitle: 'A connected atmosphere', title: 'DYAMOND Global Carbon Dioxide', category: 'CARBON CYCLE', viewer: 'globe', introduction: 'Read a global story through an atmospheric model. Model context, comparison scales, and the sonification explanation will be added once the source data is confirmed.' },
  { id: 'lightning', shortTitle: 'An electric planet', title: 'Lightning Events Detected from the ISS 2017–2023', category: 'EARTH FROM SPACE', viewer: 'map', introduction: 'Explore the selected lightning observations from space. This chapter will explain the observation period, geographic coverage, and how events become an audible rhythm.' },
  { id: 'atmospheric-river', shortTitle: 'Rivers in the sky', title: 'A 3D View of an Atmospheric River from an Earth System Model', category: 'WATER CYCLE', viewer: 'media', introduction: 'Step inside an atmospheric visualization. A guided explanation will describe the model, its dimensions, and the visual features that drive the sound experience.' },
  { id: 'forest-height', shortTitle: 'The height of a forest', title: 'GEDI Forest Height', category: 'LAND & LIFE', viewer: 'map', introduction: 'Explore forests from a new perspective. This chapter will connect the selected forest-height visualization with its measurement units, coverage, and sound mapping.' },
]
