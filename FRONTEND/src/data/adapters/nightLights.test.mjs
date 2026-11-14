import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parseNightLights, sampleNightLights, getNightLightsArea } from './nightLights.ts'

const asset = JSON.parse(readFileSync(new URL('../../../public/data/night-lights/map.json', import.meta.url), 'utf8'))
const data = parseNightLights(asset)

test('actual asset contains all annual grids with normalized values and coverage', () => {
  assert.equal(data.frames.length, 12)
  assert.equal(data.frames[0].year, 2012)
  assert.equal(data.frames.at(-1).year, 2023)
  assert.equal(data.frames[0].values.length, 16200)
  assert.ok(data.frames.some(frame => frame.coverage.some(cover => cover === 0)))
})

test('area series and comparison come from the same cell and nearest actual year', () => {
  const location = { latitude: 21, longitude: 105 }
  const area = getNightLightsArea(data, location, 2022.75)
  assert.equal(area.current.year, 2023)
  assert.equal(area.series.length, 12)
  for (let i = 0; i < 12; i++) assert.deepEqual(area.series[i], sampleNightLights(data.frames[i], location))
  assert.deepEqual(area.bounds, { north: 22, south: 20, west: 104, east: 106 })
  if (area.current.coverage === 1 && area.series[0].coverage === 1) {
    assert.equal(area.delta, area.current.value - area.series[0].value)
  }
  assert.equal(getNightLightsArea(data, { latitude: 91, longitude: 0 }, 2023), null)
  assert.equal(getNightLightsArea(data, location, NaN), null)
  assert.equal(getNightLightsArea(data, location, 2024), null)
})

test('comparison preserves negative changes and valid zeros; partial/missing years are not compared', () => {
  const source = structuredClone(data)
  for (const frame of source.frames) { frame.values[0] = 0.8; frame.coverage[0] = 1 }
  const location = { latitude: 90, longitude: -180 }
  source.frames[11].values[0] = 0
  assert.equal(getNightLightsArea(source, location, 2023).delta, -0.8)
  source.frames[11].coverage[0] = 0.5
  assert.equal(getNightLightsArea(source, location, 2023).current.value, 0)
  assert.equal(getNightLightsArea(source, location, 2023).delta, null)
  source.frames[11].coverage[0] = 1
  source.frames[0].coverage[0] = 0
  const area = getNightLightsArea(source, location, 2023)
  assert.equal(area.delta, null)
  assert.equal(area.series[0].value, null)
  assert.equal(area.series[11].value, 0)
})

test('adapter rejects malformed schema, years, grid lengths and nonfinite values', () => {
  for (const alter of [
    a => { a.schema = 'unknown' }, a => { a.frames[0].year = 2013 },
    a => { a.frames[0].values.pop() }, a => { a.frames[0].values[0] = NaN },
    a => { a.frames[0].coverage[0] = 1.01 }, a => { a.frames[0].frameId = -1 },
  ]) {
    const candidate = structuredClone(asset)
    alter(candidate)
    assert.throws(() => parseNightLights(candidate))
  }
})

test('lookup uses northwest origin, exact edge cells and never wraps the antimeridian', () => {
  const frame = data.frames[0]
  for (const [location, row, column] of [
    [{ latitude: 90, longitude: -180 }, 0, 0],
    [{ latitude: -90, longitude: 180 }, 89, 179],
    [{ latitude: 0, longitude: 0 }, 45, 90],
  ]) {
    const sample = sampleNightLights(frame, location)
    assert.equal(sample.row, row)
    assert.equal(sample.column, column)
  }
  assert.equal(sampleNightLights(frame, { latitude: NaN, longitude: 0 }), null)
})

test('valid zero, missing and partial coverage stay distinct; year changes the same-cell sample', () => {
  const frame = data.frames[0]
  for (const [value, coverage, expected] of [[0, 1, 0], [1, 0, null], [0.7, 0.4, 0.7]]) {
    const modified = { ...frame, values: [...frame.values], coverage: [...frame.coverage] }
    modified.values[0] = value
    modified.coverage[0] = coverage
    const sample = sampleNightLights(modified, { latitude: 90, longitude: -180 })
    assert.equal(sample.value, expected)
    assert.equal(sample.coverage, coverage)
  }
  const index = frame.values.findIndex((value, i) => frame.coverage[i] > 0 && value !== data.frames[11].values[i])
  assert.ok(index >= 0)
  const location = { latitude: 89 - Math.floor(index / 180) * 2, longitude: -179 + index % 180 * 2 }
  assert.notEqual(sampleNightLights(frame, location).value, sampleNightLights(data.frames[11], location).value)
})
