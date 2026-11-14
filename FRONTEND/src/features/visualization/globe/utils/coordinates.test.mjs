import assert from 'node:assert/strict'
import test from 'node:test'
import { SphereGeometry, Vector3 } from 'three'
import { isGlobeLocation, locationToPosition, positionToLocation } from './coordinates.ts'

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)

test('geographic axes agree with north, Greenwich, and east/west', () => {
  for (const [location, expected] of [
    [{ latitude: 0, longitude: 0 }, [1, 0, 0]],
    [{ latitude: 90, longitude: 0 }, [0, 1, 0]],
    [{ latitude: -90, longitude: 0 }, [0, -1, 0]],
    [{ latitude: 0, longitude: 90 }, [0, 0, -1]],
    [{ latitude: 0, longitude: -90 }, [0, 0, 1]],
  ]) locationToPosition(location).forEach((value, index) => near(value, expected[index]))
})

test('landmarks round-trip, including radius and antimeridian', () => {
  for (const location of [
    { latitude: 51.4779, longitude: 0 }, // Greenwich
    { latitude: 21.0285, longitude: 105.8542 }, // Hanoi
    { latitude: -33.8688, longitude: 151.2093 }, // Sydney
    { latitude: 40.7128, longitude: -74.006 }, // New York
    { latitude: 0, longitude: 180 },
    { latitude: 0, longitude: -180 },
  ]) {
    const [x, y, z] = locationToPosition(location, 2)
    const result = positionToLocation({ x, y, z })
    near(result.latitude, location.latitude)
    near(result.longitude, location.longitude)
  }
})

test('positions agree with actual Three sphere UVs for equirectangular textures', () => {
  const geometry = new SphereGeometry(1, 32, 16)
  try {
    const positions = geometry.getAttribute('position')
    const uvs = geometry.getAttribute('uv')
    for (let index = 0; index < positions.count; index++) {
      if (Math.abs(positions.getY(index)) > 0.999) continue
      const expected = new Vector3(...locationToPosition({
        latitude: (uvs.getY(index) - 0.5) * 180,
        longitude: (uvs.getX(index) - 0.5) * 360,
      }))
      assert.ok(expected.distanceTo(new Vector3().fromBufferAttribute(positions, index)) < 1e-6)
    }
  } finally { geometry.dispose() }
})

test('invalid locations and positions cannot create misleading selections', () => {
  for (const location of [
    { latitude: NaN, longitude: 0 }, { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: Infinity }, { latitude: 0, longitude: -181 },
  ]) {
    assert.equal(isGlobeLocation(location), false)
    assert.throws(() => locationToPosition(location), RangeError)
  }
  assert.throws(() => locationToPosition({ latitude: 0, longitude: 0 }, 0), RangeError)
  assert.throws(() => positionToLocation({ x: 0, y: 0, z: 0 }), RangeError)
  assert.throws(() => positionToLocation({ x: Infinity, y: 0, z: 0 }), RangeError)
})
