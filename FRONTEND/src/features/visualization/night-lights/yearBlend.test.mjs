import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { getNightLightsBlend } from './yearBlend.ts'
import { getNightLightsArea, parseNightLights } from '../../../data/adapters/nightLights.ts'

const data = parseNightLights(JSON.parse(readFileSync(new URL('../../../../public/data/night-lights/map.json', import.meta.url), 'utf8')))

test('annual endpoints select the same source images without stepping outside the twelve-year set', () => {
  for (let year = 2012; year <= 2023; year++) {
    const value = getNightLightsBlend(year)
    assert.equal(value.lower, year - 2012)
    assert.equal(value.blend, 0)
    assert.ok(value.upper >= value.lower && value.upper < data.frames.length)
    assert.equal(data.frames[value.lower].year, year)
  }
})

test('both renderers blend adjacent years consistently in either scrub direction', () => {
  for (const year of [2012.25, 2018.75, 2022.5, 2018.75, 2012.25]) {
    const value = getNightLightsBlend(year)
    assert.equal(data.frames[value.upper].year - data.frames[value.lower].year, 1)
    assert.equal(data.frames[value.lower].year + value.blend, year)
    const area = getNightLightsArea(data, { latitude: 21, longitude: 105 }, value.year)
    assert.equal(area.current.year, Math.round(year))
    // Shared imagery selection never changes the inspector's geographic cell.
    assert.deepEqual(area.bounds, { north: 22, south: 20, west: 104, east: 106 })
  }
})

test('invalid or out-of-range years cannot reference missing annual images', () => {
  for (const year of [NaN, Infinity, -Infinity, 1800, 3000]) {
    const value = getNightLightsBlend(year)
    assert.ok(value.year >= 2012 && value.year <= 2023)
    assert.ok(value.lower >= 0 && value.upper <= 11)
    assert.ok(value.blend >= 0 && value.blend < 1)
  }
})
