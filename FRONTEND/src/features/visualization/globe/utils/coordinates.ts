import type { GlobeLocation } from '../types'

const DEGREES = Math.PI / 180

export function isGlobeLocation(location: GlobeLocation): boolean {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
    && Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180
}

/** North = +Y, Greenwich = +X, 90 degrees east = -Z (Three SphereGeometry UVs). */
export function locationToPosition(location: GlobeLocation, radius = 1): [number, number, number] {
  if (!isGlobeLocation(location) || !Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('Expected valid geographic coordinates and a positive radius.')
  }
  const latitude = location.latitude * DEGREES
  const longitude = location.longitude * DEGREES
  return [
    radius * Math.cos(latitude) * Math.cos(longitude),
    radius * Math.sin(latitude),
    -radius * Math.cos(latitude) * Math.sin(longitude),
  ]
}

export function positionToLocation({ x, y, z }: { x: number; y: number; z: number }): GlobeLocation {
  const radius = Math.hypot(x, y, z)
  if (!Number.isFinite(radius) || radius === 0) {
    throw new RangeError('Expected a finite, nonzero surface position.')
  }
  return {
    latitude: Math.asin(Math.max(-1, Math.min(1, y / radius))) / DEGREES,
    longitude: Math.atan2(-z, x) / DEGREES,
  }
}
