// Text shown next to the grid for each dataset. Facts come from the JSON metadata
// (topic / source / mapping / time_range ...), nothing here is read at runtime.
const BASE = import.meta.env?.BASE_URL ?? '/'

export type DatasetId = 'night_lights' | 'ocean' | 'co2'

export interface DatasetDoc {
  id: DatasetId
  label: string
  url: string
  title: string
  summary: string
  /** What the horizontal / vertical axis of the grid mean for this dataset. */
  grid: { x: string; y: string }
  facts: ReadonlyArray<readonly [label: string, value: string]>
  /** How the numbers become sound. */
  sound: string
  caveat?: string
  source?: { name: string; href?: string }
}

export const DATASETS: readonly DatasetDoc[] = [
  {
    id: 'night_lights',
    label: 'Night Lights',
    url: `${BASE}data/night-lights/night_lights.json`,
    title: 'City lights at night, 2012–2023',
    summary:
      'Brightness of city lights in a night-time view of Earth, sampled once per year from 2012 to 2023. Pick a year to hear how the lights look in that frame.',
    grid: { x: 'image columns, left to right', y: 'image rows, top of the picture = high pitch' },
    facts: [
      ['Frames', '12 (one per year)'],
      ['Grid', '96 columns × 16 rows'],
      ['Calibration', 'a background frame is subtracted, then values are scaled to 0–1'],
    ],
    sound:
      'Each year is one left-to-right sweep. In every column the three brightest cells sound as notes on a pentatonic scale: higher rows are higher pitches, brighter cells are louder. Dark columns stay silent.',
    // The JSON has no "source" field, so none is shown. Add { name, href } here once you know it.
  },
  {
    id: 'ocean',
    label: 'Ocean',
    url: `${BASE}data/ocean/ocean.json`,
    title: 'Global sea surface temperature, 2007–2008',
    summary:
      'Sea surface temperature from the NASA ECCO2 ocean model visualisation, 2,001 frames from 25 March 2007 to 3 March 2008, played as one melody.',
    grid: { x: 'time, left to right', y: 'temperature, top = warmer = higher pitch' },
    facts: [
      ['Period', '25 Mar 2007 – 3 Mar 2008'],
      ['Frames', '2,001, about 21 per column'],
      ['Colour scale', '0–32 °C'],
    ],
    sound:
      'The whole year is one sweep, one note per column from the average temperature of that stretch of frames. Warmer is higher; colour runs from blue (cool) to red (warm). A sudden jump between neighbouring columns adds a short burst of noise.',
    caveat:
      'Temperatures are read back from the colours of the visualisation video, so they are approximations. The average only moves between roughly 29 and 31 °C, so pitch is stretched to that range: it shows the shape of the change, not absolute temperature.',
    source: { name: 'NASA SVS 3912 · ECCO2', href: 'https://svs.gsfc.nasa.gov/3912/' },
  },
  {
    id: 'co2',
    label: 'CO₂',
    url: `${BASE}data/carbon-dioxide/co2.json`,
    title: 'Atmospheric CO₂ simulation, Jan 2020',
    summary:
      'Carbon dioxide concentration estimated from the colours of a NASA globe animation (DYAMOND colour bar): 1,176 frames, one simulated hour each, starting 14 January 2020 at 22:00.',
    grid: { x: 'time, left to right', y: 'CO₂, top = more CO₂ = higher pitch' },
    facts: [
      ['Frames', '1,176 (1,136 with usable data)'],
      ['Colour scale', '380–460 ppm'],
      ['Mean over frames', 'about 402 ppm'],
      ['Frame timing', 'assumed from the on-screen clock'],
    ],
    sound:
      'The series is one sweep, one note per column from the average of about 12 frames. More CO₂ is a higher note; colour runs from blue (low) to red (high). Frames with too few matched pixels become silence, and sudden jumps add a burst of noise.',
    caveat:
      'Approximate only. The animation is a composited globe, so colours are blended with the Earth surface and the values are visible-rendering estimates, not measured global CO₂. Pitch is relative to this series, not absolute ppm.',
    source: { name: 'NASA globe animation (co2.mp4)' },
  },
]
