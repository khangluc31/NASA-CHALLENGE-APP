import type { MapLocation, MapPoint, MapView } from '../types'
import { isGlobeLocation } from '../../globe/utils/coordinates.ts'

export { isGlobeLocation as isMapLocation } from '../../globe/utils/coordinates.ts'
export const MAP_WIDTH = 720
export const MAP_HEIGHT = 360
export const MAX_ZOOM = 8

/** Equirectangular: west to east, north at the top. Poles are distorted. */
export function locationToMapPoint(location: MapLocation): MapPoint {
  if (!isGlobeLocation(location)) throw new RangeError('Expected valid geographic coordinates.')
  return { x: (location.longitude + 180) * 2, y: (90 - location.latitude) * 2 }
}

export function mapPointToLocation({ x, y }: MapPoint): MapLocation {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > MAP_WIDTH || y < 0 || y > MAP_HEIGHT) {
    throw new RangeError('Expected a point inside the reference map.')
  }
  return { latitude: 90 - y / 2, longitude: x / 2 - 180 }
}

export function constrainView(view: MapView): MapView {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, view.zoom))
  return {
    zoom,
    x: Math.max(MAP_WIDTH * (1 - zoom), Math.min(0, view.x)),
    y: Math.max(MAP_HEIGHT * (1 - zoom), Math.min(0, view.y)),
  }
}

/** Keep the geographic point beneath the zoom anchor stationary. */
export function zoomView(view: MapView, factor: number, anchor: MapPoint): MapView {
  const zoom = Math.max(1, Math.min(MAX_ZOOM, view.zoom * factor))
  const ratio = zoom / view.zoom
  return constrainView({ zoom, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio })
}
