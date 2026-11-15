import assert from 'node:assert/strict'
import test from 'node:test'
import { observeCurrentView } from './useCurrentView.ts'

class Video extends EventTarget {
  paused = true
  currentTime = 0
  duration = 39.2
  callbacks = new Map()
  serial = 0
  requestVideoFrameCallback(callback) { const id = ++this.serial; this.callbacks.set(id, callback); return id }
  cancelVideoFrameCallback(id) { this.callbacks.delete(id) }
  present(time) {
    this.currentTime = time + .02
    const callbacks = [...this.callbacks.values()]
    this.callbacks.clear()
    for (const callback of callbacks) callback(0, { mediaTime: time })
  }
  play() { this.paused = false; this.dispatchEvent(new Event('play')) }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
}

test('publishes a frozen presented timestamp on pause without per-frame state updates', () => {
  const video = new Video()
  const states = []
  const stop = observeCurrentView(video, value => states.push(value))
  assert.deepEqual(states.at(-1), { status: 'paused', time: 0, duration: 39.2 })
  video.play()
  video.present(1)
  video.present(2)
  assert.equal(states.length, 2)
  assert.deepEqual(states.at(-1), { status: 'playing' })
  video.pause()
  assert.deepEqual(states.at(-1), { status: 'paused', time: 2, duration: 39.2 })
  assert.equal(video.callbacks.size, 0)
  stop()
})

test('seeking and looping do not reuse a stale frame timestamp', () => {
  const video = new Video()
  const states = []
  const stop = observeCurrentView(video, value => states.push(value))
  video.play()
  video.present(39)
  video.currentTime = 0
  video.pause()
  assert.equal(states.at(-1).time, 0)
  video.currentTime = 10
  video.dispatchEvent(new Event('seeked'))
  assert.equal(states.at(-1).time, 10)
  stop()
})

test('fallback uses playback time and cleanup removes subscriptions and scheduled callbacks', () => {
  const video = new Video()
  video.requestVideoFrameCallback = undefined
  const states = []
  const stop = observeCurrentView(video, value => states.push(value))
  video.play()
  video.currentTime = 12.5
  video.pause()
  assert.equal(states.at(-1).time, 12.5)
  stop()
  const count = states.length
  video.play()
  video.pause()
  assert.equal(states.length, count)

  const withCallbacks = new Video()
  withCallbacks.paused = false
  const dispose = observeCurrentView(withCallbacks, () => {})
  assert.equal(withCallbacks.callbacks.size, 1)
  dispose()
  assert.equal(withCallbacks.callbacks.size, 0)
})
