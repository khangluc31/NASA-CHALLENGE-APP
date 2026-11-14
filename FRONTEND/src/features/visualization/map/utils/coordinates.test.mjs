import assert from 'node:assert/strict'
import test from 'node:test'
import { locationToMapPoint, mapPointToLocation, constrainView, zoomView } from './coordinates.ts'

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)

test('projection matches image corners, equator and prime meridian', () => {
  assert.deepEqual(locationToMapPoint({ latitude: 90, longitude: -180 }), { x: 0, y: 0 })
  assert.deepEqual(locationToMapPoint({ latitude: -90, longitude: 180 }), { x: 720, y: 360 })
  assert.deepEqual(locationToMapPoint({ latitude: 0, longitude: 0 }), { x: 360, y: 180 })
})

test('landmarks and both antimeridian edges round-trip', () => {
  for (const location of [
    { latitude: 21.0285, longitude: 105.8542 },
    { latitude: -33.8688, longitude: 151.2093 },
    { latitude: 40.7128, longitude: -74.006 },
    { latitude: 90, longitude: 180 },
    { latitude: -90, longitude: -180 },
  ]) {
    const result = mapPointToLocation(locationToMapPoint(location))
    near(result.latitude, location.latitude)
    near(result.longitude, location.longitude)
  }
})

test('invalid coordinates and points outside the image cannot become selections', () => {
  for (const location of [{ latitude: NaN, longitude: 0 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: Infinity }]) {
    assert.throws(() => locationToMapPoint(location), RangeError)
  }
  for (const point of [{ x: -1, y: 0 }, { x: 0, y: 361 }, { x: Infinity, y: 0 }]) {
    assert.throws(() => mapPointToLocation(point), RangeError)
  }
})

test('zoom preserves the location under the anchor and pan exposes no blank margins', () => {
  const original = { zoom: 2, x: -200, y: -100 }
  const anchor = { x: 240, y: 120 }
  const next = zoomView(original, 1.5, anchor)
  near((anchor.x - original.x) / original.zoom, (anchor.x - next.x) / next.zoom)
  near((anchor.y - original.y) / original.zoom, (anchor.y - next.y) / next.zoom)
  assert.deepEqual(constrainView({ zoom: 2, x: -10000, y: 10000 }), { zoom: 2, x: -720, y: 0 })
  assert.deepEqual(zoomView(next, 0.001, anchor), { zoom: 1, x: 0, y: 0 })
  assert.equal(zoomView(next, 100, anchor).zoom, 8)
})
