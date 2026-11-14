import { isGlobeLocation } from '../../features/visualization/globe/utils/coordinates.ts'
import type { GlobeLocation } from '../../features/visualization/globe/types'

export const NIGHT_LIGHTS_ROWS = 90
export const NIGHT_LIGHTS_COLS = 180
const CELL_COUNT = NIGHT_LIGHTS_ROWS * NIGHT_LIGHTS_COLS

export interface NightLightsFrame {
  year: number
  frameId: number
  values: number[]
  coverage: number[]
}
export interface NightLightsData { frames: NightLightsFrame[] }

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a Night Lights object.')
  return Object.fromEntries(Object.entries(value))
}
function list(value: unknown, length: number): unknown[] {
  if (!Array.isArray(value) || value.length !== length) throw new Error('Unexpected Night Lights grid size.')
  return value
}
function unit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new Error('Invalid brightness or coverage.')
  return value
}
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('Invalid Night Lights frame identifier.')
  return value
}

/** Compact asset: row-major values, northwest origin, no rounding or interpolation. */
export function parseNightLights(input: unknown): NightLightsData {
  const data = record(input)
  if (data.schema !== 'night-lights-map-v1' || data.rows !== NIGHT_LIGHTS_ROWS || data.cols !== NIGHT_LIGHTS_COLS) {
    throw new Error('Unsupported Night Lights asset.')
  }
  return { frames: list(data.frames, 12).map((entry, index) => {
    const frame = record(entry)
    if (frame.year !== 2012 + index) throw new Error('Expected annual Night Lights frames from 2012 through 2023.')
    return { year: frame.year, frameId: integer(frame.frameId),
      values: list(frame.values, CELL_COUNT).map(unit), coverage: list(frame.coverage, CELL_COUNT).map(unit) }
  }) }
}

/** Offline conversion of the teammate's original column-major extraction. */
export function prepareNightLights(input: unknown) {
  const raw = record(input)
  if (raw.topic !== 'night_lights') throw new Error('Not a Night Lights extraction.')
  const grid = record(record(raw.grid).data)
  if (grid.rows !== NIGHT_LIGHTS_ROWS || grid.cols !== NIGHT_LIGHTS_COLS) throw new Error('Unexpected extraction grid.')
  const asset = { schema: 'night-lights-map-v1', rows: NIGHT_LIGHTS_ROWS, cols: NIGHT_LIGHTS_COLS,
    frames: list(raw.frames, 12).map((entry) => {
      const frame = record(entry)
      const values = Array<number>(CELL_COUNT)
      const coverage = Array<number>(CELL_COUNT)
      list(frame.columns, NIGHT_LIGHTS_COLS).forEach((entry, column) => {
        const data = record(entry)
        if (data.column !== column) throw new Error('Unexpected extraction column order.')
        list(data.rows, NIGHT_LIGHTS_ROWS).forEach((entry, row) => {
          const cell = record(entry)
          values[row * NIGHT_LIGHTS_COLS + column] = unit(cell.value)
          coverage[row * NIGHT_LIGHTS_COLS + column] = unit(cell.cover)
        })
      })
      return { year: frame.year, frameId: frame.frame_id, values, coverage }
    }) }
  parseNightLights(asset)
  return asset
}

/** Cell lookup, not interpolation. The two antimeridian edges remain distinct. */
export function sampleNightLights(frame: NightLightsFrame, location: GlobeLocation) {
  if (!isGlobeLocation(location)) return null
  const column = Math.min(NIGHT_LIGHTS_COLS - 1, Math.floor((location.longitude + 180) / 2))
  const row = Math.min(NIGHT_LIGHTS_ROWS - 1, Math.floor((90 - location.latitude) / 2))
  const index = row * NIGHT_LIGHTS_COLS + column
  return { year: frame.year, row, column, coverage: frame.coverage[index],
    value: frame.coverage[index] > 0 ? frame.values[index] : null }
}

/** One immutable series drives the inspector numbers and chart. No interpolation. */
export function getNightLightsArea(data: NightLightsData, location: GlobeLocation, year: number) {
  if (!isGlobeLocation(location) || !Number.isFinite(year)) return null
  const series = data.frames.map(frame => sampleNightLights(frame, location)).filter(sample => sample !== null)
  const current = series.find(sample => sample.year === Math.round(year))
  const baseline = series.find(sample => sample.year === 2012)
  if (!current || !baseline) return null
  const comparable = current.value !== null && baseline.value !== null && current.coverage === 1 && baseline.coverage === 1
  return {
    series, current,
    delta: comparable && current.value !== null && baseline.value !== null ? current.value - baseline.value : null,
    bounds: { north: 90 - current.row * 2, south: 88 - current.row * 2,
      west: -180 + current.column * 2, east: -178 + current.column * 2 },
  }
}
