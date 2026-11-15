import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parseOcean, getOceanFrame } from './ocean.ts'

const source = JSON.parse(readFileSync(new URL('../../../public/data/ocean/ocean.json', import.meta.url), 'utf8'))
const data = parseOcean(source)

test('provided Ocean frames preserve source means and 10th–90th percentiles', () => {
  assert.equal(data.frames.length, 2001)
  assert.equal(data.fps, 30)
  assert.equal(data.duration, 66.7)
  for (const id of [0, 1000, 2000]) {
    const value = source.frames[id].temperature
    assert.deepEqual(data.frames[id], { mean: value.mean_temp, lower: value.p10_temp, upper: value.p90_temp })
  }
})

test('paused time selects Ocean frames including start, boundary and endpoint', () => {
  for (const id of [0, 1, 999, 1000, 2000]) assert.equal(getOceanFrame(data, id / 30, 66.7), data.frames[id])
  assert.equal(getOceanFrame(data, 10, 66.7), data.frames[300])
  assert.equal(getOceanFrame(data, 66.7, 66.7), data.frames[2000])
  assert.equal(getOceanFrame(data, 0, 66.7), data.frames[0])
  for (const time of [-1, NaN, Infinity, 67]) assert.equal(getOceanFrame(data, time, 66.7), null)
  for (const duration of [NaN, Infinity, 39.2, 67]) assert.equal(getOceanFrame(data, 10, duration), null)
})

test('valid zero stays zero; missing or unmatched temperatures stay unavailable', () => {
  const input = structuredClone(source)
  input.frames[0].temperature.mean_temp = 0
  input.frames[0].temperature.p10_temp = 0
  assert.equal(parseOcean(input).frames[0].mean, 0)
  input.frames[0].temperature.mean_temp = null
  assert.equal(parseOcean(input).frames[0].mean, null)
  input.frames[1].temperature.color_match_coverage = 0
  input.frames[2].temperature.valid_pixel_count = 0
  assert.deepEqual(parseOcean(input).frames[1], { mean: null, lower: null, upper: null })
  assert.deepEqual(parseOcean(input).frames[2], { mean: null, lower: null, upper: null })
})

test('malformed, incomplete or out-of-order Ocean data is rejected', () => {
  for (const mutate of [
    value => { value.video.fps = 0 },
    value => { value.video.sample_step = 2 },
    value => { value.frames.pop() },
    value => { value.frames[0].frame_id = 1 },
    value => { value.frames[0].video_time_seconds = 3 },
    value => { value.temperature.unit = 'fahrenheit' },
    value => { value.frames[0].temperature.mean_temp = 100 },
    value => { value.frames[0].temperature.p10_temp = 32; value.frames[0].temperature.p90_temp = 0 },
    value => { value.frames[0].temperature.color_match_coverage = 2 },
    value => { value.frames[0].temperature.valid_pixel_count = -1 },
  ]) {
    const input = structuredClone(source)
    mutate(input)
    assert.throws(() => parseOcean(input))
  }
})
