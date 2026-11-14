import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { DemoAudioEngine } from '../src/features/audio/demo-audio-engine.ts'

let contexts, requests, fetchImpl
const originalFetch = globalThis.fetch
const originalContext = globalThis.AudioContext
const originalWindow = globalThis.window
class FakeContext {
  currentTime = 0
  state = 'suspended'
  destination = {}
  sources = []
  gain = { gain: { value: 0, setTargetAtTime(value) { this.value = value }, cancelScheduledValues() {} }, connect() {} }
  constructor() { contexts.push(this) }
  createGain() { return this.gain }
  createAnalyser() { return { connect() {}, fftSize: 0 } }
  async resume() { this.state = 'running' }
  async close() { this.state = 'closed' }
  async decodeAudioData() { return { duration: 7.7 } }
  createBufferSource() {
    const node = { connect() {}, disconnect() {}, start(_when, offset) { this.offset = offset }, stop() { this.stopped = true }, onended: null }
    this.sources.push(node)
    return node
  }
}
beforeEach(() => {
  contexts = []; requests = []
  fetchImpl = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })
  globalThis.fetch = (url, options) => { requests.push(url); return fetchImpl(url, options) }
  globalThis.AudioContext = FakeContext
  globalThis.window = { setTimeout: callback => { callback(); return 0 } }
})
afterEach(() => { globalThis.fetch = originalFetch; globalThis.AudioContext = originalContext; globalThis.window = originalWindow })

test('no autoplay; pause resumes at the same point, stop resets', async () => {
  const player = new DemoAudioEngine(() => {})
  assert.equal(contexts.length, 0)
  await player.play()
  assert.equal(player.playing, true)
  contexts[0].currentTime = 2
  player.pause()
  assert.equal(player.position, 2)
  assert.equal(player.playing, false)
  await player.play()
  assert.equal(contexts[0].sources[1].offset, 2)
  player.stop()
  assert.equal(player.position, 0)
  player.dispose()
  assert.equal(contexts[0].state, 'closed')
})

test('Stop during loading prevents late playback', async () => {
  let resolve
  fetchImpl = () => new Promise(done => { resolve = done })
  const player = new DemoAudioEngine(() => {})
  const play = player.play()
  await Promise.resolve()
  player.stop()
  resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })
  await play
  assert.equal(player.playing, false)
  assert.equal(contexts[0].sources.length, 0)
  player.dispose()
})

test('bundled changing audio loads without an external request', async () => {
  const player = new DemoAudioEngine(() => {})
  await player.play()
  assert.deepEqual(requests, ['/media/atlas-demo.wav'])
  assert.match(player.label, /Local demo/)
  assert.equal(player.playing, true)
  player.dispose()
})

test('failed download can be retried without starting a silent source', async () => {
  fetchImpl = async () => { throw new Error('unavailable') }
  const player = new DemoAudioEngine(() => {})
  await assert.rejects(player.play(), /unavailable/)
  assert.equal(player.playing, false)
  fetchImpl = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) })
  await player.play()
  assert.equal(player.playing, true)
  player.dispose()
})

test('natural end can replay; gain is clamped and disposal stops the source', async () => {
  let ended = 0
  const player = new DemoAudioEngine(() => ended++)
  player.setVolume(5)
  await player.play()
  assert.equal(contexts[0].gain.gain.value, 1)
  contexts[0].sources[0].onended()
  assert.equal(ended, 1)
  assert.equal(player.position, 7.7)
  await player.play()
  assert.equal(contexts[0].sources[1].offset, 0)
  player.setVolume(0)
  assert.equal(contexts[0].gain.gain.value, 0)
  player.dispose()
  assert.equal(contexts[0].sources[1].stopped, true)
})
