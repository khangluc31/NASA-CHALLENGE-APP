import assert from 'node:assert/strict'
import test from 'node:test'
import { observeVideoFrames } from './videoFrames.ts'

class FakeVideo extends EventTarget {
  readyState = 2
  paused = true
  ended = false
  callbacks = new Map()
  nextId = 0
  requestVideoFrameCallback(callback) { const id = ++this.nextId; this.callbacks.set(id, callback); return id }
  cancelVideoFrameCallback(id) { this.callbacks.delete(id) }
  frame() { const [id, callback] = this.callbacks.entries().next().value; this.callbacks.delete(id); callback() }
}

test('frame subscriptions render paused/seeked pixels and stop all work on disposal', () => {
  const video = new FakeVideo()
  let draws = 0
  const stop = observeVideoFrames(video, () => { draws++ })
  assert.equal(draws, 1)
  assert.equal(video.callbacks.size, 0)
  video.paused = false
  video.dispatchEvent(new Event('play'))
  assert.equal(video.callbacks.size, 1)
  video.frame()
  assert.equal(draws, 3)
  assert.equal(video.callbacks.size, 1)
  video.paused = true
  video.dispatchEvent(new Event('pause'))
  assert.equal(video.callbacks.size, 0)
  video.dispatchEvent(new Event('seeked'))
  assert.equal(draws, 5)
  stop()
  video.paused = false
  video.dispatchEvent(new Event('play'))
  assert.equal(draws, 5)
  assert.equal(video.callbacks.size, 0)
})

test('pending video frame callbacks are canceled on renderer/view replacement', () => {
  const video = new FakeVideo()
  video.paused = false
  const stop = observeVideoFrames(video, () => {})
  assert.equal(video.callbacks.size, 1)
  stop()
  assert.equal(video.callbacks.size, 0)
})
