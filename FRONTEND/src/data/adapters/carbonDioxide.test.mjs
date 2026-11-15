import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parseCarbonDioxide, getCarbonDioxideFrame } from './carbonDioxide.ts'

const source = JSON.parse(readFileSync(new URL('../../../public/data/carbon-dioxide/co2.json', import.meta.url), 'utf8'))
const data = parseCarbonDioxide(source)

test('provided extraction preserves all frames, means, percentiles and unavailable records', () => {
  assert.equal(data.frames.length, 1176)
  assert.equal(data.fps, 30)
  assert.equal(data.duration, 39.2)
  assert.equal(data.frames.filter(frame => frame.mean === null).length, 40)
  assert.deepEqual(data.frames[500], { frameId: 500, mean: 380.493, lower: 380, upper: 382.886 })
})

test('paused media time selects a frame at 30 fps, including loop start and endpoint', () => {
  for (const id of [0, 1, 299, 300, 500, 1175]) {
    assert.equal(getCarbonDioxideFrame(data, id / 30, 39.2).frameId, id)
  }
  assert.equal(getCarbonDioxideFrame(data, 10, 39.2).frameId, 300)
  assert.equal(getCarbonDioxideFrame(data, 39.2, 39.2).frameId, 1175)
  assert.equal(getCarbonDioxideFrame(data, 0, 39.2).frameId, 0)
  assert.equal(getCarbonDioxideFrame(data, 1175 / 30, 39.2).mean, null)
})

test('invalid time or mismatched sequence duration returns unavailable rather than stretching the data', () => {
  for (const time of [-1, NaN, Infinity, 40]) assert.equal(getCarbonDioxideFrame(data, time, 39.2), null)
  for (const duration of [NaN, Infinity, 0, 40]) assert.equal(getCarbonDioxideFrame(data, 10, duration), null)
})

test('external data validation rejects malformed values, timing, frame order and quality', () => {
  for (const mutate of [
    value => { value.video_metadata.fps = 0 },
    value => { value.frames.pop() },
    value => { value.frames[0].frame_id = 10 },
    value => { value.frames[0].co2_mean_ppm = 999 },
    value => { value.frames[0].co2_min_ppm = '380' },
    value => { value.frames[0].quality = 'unknown' },
    value => { value.frames[0].video_time_sec = 1 },
  ]) {
    const invalid = structuredClone(source)
    mutate(invalid)
    assert.throws(() => parseCarbonDioxide(invalid))
  }
})
