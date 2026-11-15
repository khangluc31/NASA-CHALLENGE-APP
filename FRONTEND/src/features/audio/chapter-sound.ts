import type { Features } from '../../../audio/types'
import { parseCarbonDioxide, getCarbonDioxideFrame } from '../../data/adapters/carbonDioxide.ts'
import { parseOcean, getOceanFrame } from '../../data/adapters/ocean.ts'
import { parseNightLights, NIGHT_LIGHTS_COLS, NIGHT_LIGHTS_ROWS } from '../../data/adapters/nightLights.ts'
import type { VideoCurrentView } from '../visualization/media/useCurrentView'

export type SoundSource = { chapter: string; view?: VideoCurrentView; year?: number }
export const DATA_PATHS: Record<string, string> = {
  'carbon-dioxide': 'data/carbon-dioxide/co2.json',
  'ocean-temperature': 'data/ocean/ocean.json',
  'night-lights': 'data/night-lights/map.json',
}

export function sourceKey(source: SoundSource) {
  return source.chapter === 'night-lights' ? `year-${Math.round(source.year ?? 2012)}`
    : source.view?.status === 'paused' ? `frame-${source.view.time}-${source.view.duration}` : source.view?.status ?? 'loading'
}

export function makeChapterSound(input: unknown, source: SoundSource): Features | null {
  if (source.chapter === 'night-lights') {
    const frame = parseNightLights(input).frames.find(frame => frame.year === Math.round(source.year ?? 2012))
    if (!frame) return null
    // Preserve the validated map cell values and coverage, transposing only for left-to-right audio scanning.
    return { year: frame.year, columns: Array.from({ length: NIGHT_LIGHTS_COLS }, (_, column) => {
      const rows = Array.from({ length: NIGHT_LIGHTS_ROWS }, (_, row) => {
        const index = row * NIGHT_LIGHTS_COLS + column
        return { hue: 45, light: frame.coverage[index] >= 0.5 ? frame.values[index] : 0 }
      })
      return { hue: 45, sat: 0.8, light: Math.max(...rows.map(row => row.light)), edge: 0, rows }
    }) }
  }
  if (source.view?.status !== 'paused') return null
  const { time, duration } = source.view
  const frame = source.chapter === 'carbon-dioxide'
    ? getCarbonDioxideFrame(parseCarbonDioxide(input), time, duration)
    : source.chapter === 'ocean-temperature' ? getOceanFrame(parseOcean(input), time, duration) : null
  if (!frame || frame.mean === null) return null
  const level = Math.max(0, Math.min(1, source.chapter === 'carbon-dioxide' ? (frame.mean - 380) / 80 : frame.mean / 32))
  const hue = 230 * (1 - level)
  const selectedRow = Math.round((1 - level) * 15)
  // Eight repeated pulses express a single value; they do not imply extra frame measurements.
  return { columns: Array.from({ length: 8 }, () => ({ hue, sat: 0.8, light: 1, edge: 0,
    rows: Array.from({ length: 16 }, (_, row) => ({ hue, light: row === selectedRow ? 1 : 0 })) })) }
}
