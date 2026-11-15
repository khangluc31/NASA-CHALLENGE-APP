import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeChapterSound, sourceKey } from './chapter-sound.ts'
const read = path => JSON.parse(readFileSync(new URL(`../../../public/${path}`, import.meta.url), 'utf8'))
const co2 = read('data/carbon-dioxide/co2.json')
const ocean = read('data/ocean/ocean.json')
const night = read('data/night-lights/map.json')
const paused = (chapter, time, duration) => ({ chapter, view: { status: 'paused', time, duration } })

test('frame sounds require a paused, covered sample with compatible timing', () => {
  for (const chapter of ['carbon-dioxide', 'ocean-temperature']) {
    const data = chapter === 'carbon-dioxide' ? co2 : ocean
    assert.equal(makeChapterSound(data, { chapter, view: { status: 'playing' } }), null)
    assert.equal(makeChapterSound(data, paused(chapter, 0, 500)), null)
  }
  assert.equal(makeChapterSound(co2, paused('carbon-dioxide', 1175 / 30, 39.2)), null)
  assert.equal(makeChapterSound(ocean, paused('ocean-temperature', -1, 66.7)), null)
})

test('sound pitches follow the inspector value using fixed chapter domains', () => {
  for (const [chapter, data, duration, value] of [
    ['carbon-dioxide', co2, 39.2, (co2.frames[0].co2_mean_ppm - 380) / 80],
    ['ocean-temperature', ocean, 66.7, ocean.frames[0].temperature.mean_temp / 32],
  ]) {
    const sound = makeChapterSound(data, paused(chapter, 0, duration))
    assert.equal(sound.columns.length, 8)
    assert.equal(sound.columns[0].rows.findIndex(row => row.light === 1), Math.round((1 - value) * 15))
    assert.ok(sound.columns.every(column => column.rows.filter(row => row.light > 0).length === 1))
  }
})

test('Night Lights uses the nearest year and preserves actual grid samples and coverage', () => {
  for (const year of [2012, 2018.75, 2023]) {
    const sound = makeChapterSound(night, { chapter: 'night-lights', year })
    const frame = night.frames[Math.round(year) - 2012]
    assert.equal(sound.year, Math.round(year))
    assert.equal(sound.columns.length, 180)
    for (const column of [0, 45, 179]) for (const row of [0, 30, 89]) {
      const id = row * 180 + column
      assert.equal(sound.columns[column].rows[row].light, frame.coverage[id] >= 0.5 ? frame.values[id] : 0)
    }
  }
  assert.equal(makeChapterSound(night, { chapter: 'night-lights', year: 2000 }), null)
})

test('a changed frame or nearest year invalidates the old sound', () => {
  assert.notEqual(sourceKey(paused('carbon-dioxide', 10, 39.2)), sourceKey(paused('carbon-dioxide', 11, 39.2)))
  assert.notEqual(sourceKey(paused('carbon-dioxide', 10, 39.2)), sourceKey({ chapter: 'carbon-dioxide', view: { status: 'playing' } }))
  assert.equal(sourceKey({ chapter: 'night-lights', year: 2018.1 }), sourceKey({ chapter: 'night-lights', year: 2018.2 }))
  assert.notEqual(sourceKey({ chapter: 'night-lights', year: 2018 }), sourceKey({ chapter: 'night-lights', year: 2019 }))
})
